from pydantic import BaseModel


class CollectionDTO(BaseModel):
    id: int
    name: str
    image_url: str | None
    recipe_count: int


class PersonalRecipeDTO(BaseModel):
    id: int
    title: str
    image_url: str | None
