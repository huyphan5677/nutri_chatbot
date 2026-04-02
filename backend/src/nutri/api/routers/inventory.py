import uuid

from fastapi import APIRouter, Depends, HTTPException
from nutri.api.dependencies import get_current_user
from nutri.core.auth.models import User
from nutri.core.db.session import get_db
from nutri.core.grocery.models import UserInventory
from nutri.core.inventory.dto import (
    AddInventoryItemRequest,
    BulkAddInventoryRequest,
    InventoryItemDTO,
    InventoryListResponse,
    RenameCategoryRequest,
    UpdateInventoryItemRequest,
)
from nutri.core.inventory.services import accumulate_quantities
from nutri.core.menus.models import Ingredient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

router = APIRouter()


@router.get("/current", response_model=InventoryListResponse)
async def get_current_inventory(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get the current inventory for the user."""
    query = (
        select(UserInventory)
        .options(selectinload(UserInventory.ingredient))
        .where(UserInventory.user_id == current_user.id)
        .order_by(UserInventory.updated_at.desc())
    )
    res = await db.execute(query)
    items = res.scalars().all()

    dtos = []
    for item in items:
        dtos.append(
            InventoryItemDTO(
                id=str(item.id),
                name=item.ingredient.name if item.ingredient else "Unknown",
                category=item.ingredient.category if item.ingredient else "Other",
                quantity=str(item.quantity) if item.quantity else "1",
                expiration_date=item.expiration_date,
            )
        )

    return InventoryListResponse(items=dtos)


@router.post("", response_model=InventoryItemDTO)
async def add_inventory_item(
    request: AddInventoryItemRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add an ingredient to the user's inventory."""
    # 1. Find or create the ingredient
    ingredient_query = select(Ingredient).where(Ingredient.name.ilike(request.name))
    ingredient_res = await db.execute(ingredient_query)
    ingredient = ingredient_res.scalars().first()

    if not ingredient:
        ingredient = Ingredient(
            id=uuid.uuid4(),
            name=request.name.title(),
            category=request.category,
        )
        db.add(ingredient)
        await db.flush()

    # 2. Check if user already has it
    inv_query = select(UserInventory).where(
        UserInventory.user_id == current_user.id,
        UserInventory.ingredient_id == ingredient.id,
    )
    inv_res = await db.execute(inv_query)
    existing_item = inv_res.scalars().first()

    if existing_item:
        existing_item.quantity = accumulate_quantities(
            str(existing_item.quantity) if existing_item.quantity else "",
            request.quantity,
        )
        new_item = existing_item
    else:
        new_item = UserInventory(
            id=uuid.uuid4(),
            user_id=current_user.id,
            ingredient_id=ingredient.id,
            quantity=request.quantity,
            expiration_date=request.expiration_date,
        )
        db.add(new_item)

    await db.commit()

    return InventoryItemDTO(
        id=str(new_item.id),
        name=ingredient.name,
        category=ingredient.category,
        quantity=str(new_item.quantity),
        expiration_date=new_item.expiration_date,
    )


# --------
# Bulk Add
# --------


@router.post("/bulk", response_model=InventoryListResponse)
async def bulk_add_inventory_items(
    request: BulkAddInventoryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add multiple ingredients to the user's inventory in one transaction."""
    dtos = []

    # Process each item in the bulk request
    for item_req in request.items:
        # 1. Find or create the ingredient
        ingredient_query = select(Ingredient).where(
            Ingredient.name.ilike(item_req.name)
        )
        ingredient_res = await db.execute(ingredient_query)
        ingredient = ingredient_res.scalars().first()

        if not ingredient:
            ingredient = Ingredient(
                id=uuid.uuid4(),
                name=item_req.name.title(),
                category=item_req.category,
            )
            db.add(ingredient)
            await db.flush()

        # 2. Check existing user inventory item to accumulate quantity
        inv_query = select(UserInventory).where(
            UserInventory.user_id == current_user.id,
            UserInventory.ingredient_id == ingredient.id,
        )
        inv_res = await db.execute(inv_query)
        existing_item = inv_res.scalars().first()

        if existing_item:
            existing_item.quantity = accumulate_quantities(
                str(existing_item.quantity) if existing_item.quantity else "",
                item_req.quantity,
            )
            # Use existing item fields for DTO
            item_id = str(existing_item.id)
            final_qty = existing_item.quantity
            final_exp = existing_item.expiration_date
        else:
            new_item = UserInventory(
                id=uuid.uuid4(),
                user_id=current_user.id,
                ingredient_id=ingredient.id,
                quantity=item_req.quantity,
                expiration_date=item_req.expiration_date,
            )
            db.add(new_item)
            item_id = str(new_item.id)
            final_qty = new_item.quantity
            final_exp = new_item.expiration_date

        # Prepare DTO
        dtos.append(
            InventoryItemDTO(
                id=item_id,
                name=ingredient.name,
                category=ingredient.category,
                quantity=str(final_qty),
                expiration_date=final_exp,
            )
        )

    await db.commit()
    return InventoryListResponse(items=dtos)


# -----------------
# Inventory Item ID
# -----------------


@router.delete("/{item_id}")
async def delete_inventory_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an ingredient from the user's inventory."""
    query = select(UserInventory).where(
        UserInventory.id == item_id,
        UserInventory.user_id == current_user.id,
    )
    result = await db.execute(query)
    item = result.scalars().first()

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    await db.delete(item)
    await db.commit()

    return {"status": "success", "message": "Inventory item deleted"}


@router.patch("/{item_id}", response_model=InventoryItemDTO)
async def update_inventory_item(
    item_id: str,
    request: UpdateInventoryItemRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an ingredient in the user's inventory."""
    # 1. Find the inventory row
    query = (
        select(UserInventory)
        .options(selectinload(UserInventory.ingredient))
        .where(
            UserInventory.id == item_id,
            UserInventory.user_id == current_user.id,
        )
    )
    result = await db.execute(query)
    inventory_item = result.scalars().first()

    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # 2. Re-link Ingredient if name or category changed
    if request.name is not None or request.category is not None:
        new_name = request.name or (
            inventory_item.ingredient.name if inventory_item.ingredient else "Unknown"
        )
        new_category = request.category or (
            inventory_item.ingredient.category if inventory_item.ingredient else "Other"
        )

        ing_query = select(Ingredient).where(Ingredient.name.ilike(new_name))
        ing_res = await db.execute(ing_query)
        ingredient = ing_res.scalars().first()

        if not ingredient:
            ingredient = Ingredient(
                id=uuid.uuid4(),
                name=new_name.title(),
                category=new_category,
            )
            db.add(ingredient)
            await db.flush()
        elif request.category is not None and ingredient.category != request.category:
            ingredient.category = request.category

        inventory_item.ingredient_id = ingredient.id
        inventory_item.ingredient = ingredient

    # 3. Update specific fields
    if request.quantity is not None:
        inventory_item.quantity = request.quantity

    if request.expiration_date is not None:
        inventory_item.expiration_date = request.expiration_date

    await db.commit()
    await db.refresh(inventory_item)

    return InventoryItemDTO(
        id=str(inventory_item.id),
        name=inventory_item.ingredient.name if inventory_item.ingredient else "Unknown",
        category=inventory_item.ingredient.category
        if inventory_item.ingredient
        else "Other",
        quantity=str(inventory_item.quantity) if inventory_item.quantity else "1",
        expiration_date=inventory_item.expiration_date,
    )


@router.patch("/categories/rename")
async def rename_inventory_category(
    request: RenameCategoryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename all ingredients categorized under old_name to new_name."""
    # We find all ingredients that have been used by the current user
    # and have the exact category name (case-insensitive for robustness)
    # and update them to the new name.
    
    # In this simplified model, Ingredients are shared. 
    # Renaming a category is a global metadata update.
    
    query = select(Ingredient).where(Ingredient.category.ilike(request.old_name))
    result = await db.execute(query)
    ingredients = result.scalars().all()
    
    if not ingredients:
        # If no ingredients match, maybe it's only in the UserInventory?
        # But category is on Ingredient.
        return {"status": "success", "count": 0}
        
    for ing in ingredients:
        ing.category = request.new_name
        
    await db.commit()
    return {"status": "success", "count": len(ingredients)}
