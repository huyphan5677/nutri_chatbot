# Design System

This document describes the styling approach, design tokens, typography, color palette, animation system, and reusable UI component library used in the Nutri frontend.

---

## 1. Styling Approach

The application uses **Tailwind CSS 3.4** as its sole styling solution. There are:

- No CSS modules.
- No CSS-in-JS (styled-components, Emotion).
- No third-party component library (Material UI, Ant Design, Chakra).
- No separate `.css` files per component.

All styling is applied via Tailwind utility classes directly in JSX. The `index.css` file contains:
- Tailwind directives (`@tailwind base/components/utilities`).
- Global base layer styles.
- Custom utility classes (scrollbar styles, marquee animation).

---

## 2. Design Tokens

### Color Palette

Defined in `tailwind.config.js`:

| Token          | Value       | Usage                                        |
| -------------- | ----------- | -------------------------------------------- |
| `primary`      | `#FF5A5F`   | Primary action color, buttons, active states  |
| `secondary`    | `#333333`   | Body text, dark text elements                 |
| `background`   | `#F9FAFB`   | Page background fallback                      |
| `accent`       | `#F59E0B`   | Accent highlights (amber)                     |
| `warm-50`      | `#FFFBF5`   | Warm background tint                          |
| `warm-100`     | `#FFF7ED`   | Warm background medium                        |
| `warm-200`     | `#FFEDD5`   | Warm background strong                        |

In practice, many components use hardcoded hex values (e.g., `text-[#FF5C5C]`, `bg-[#FFFBF6]`) rather than the token names. This is a consistency issue; the semantic tokens and inline hex values should be reconciled.

### Additional Colors Used In-Code

| Hex Value   | Typical Usage              |
| ----------- | -------------------------- |
| `#FF5C5C`   | Primary red (variant of `primary`) |
| `#FFFBF6`   | Warm beige page background |
| `#F2ECE4`   | Dashboard header background |
| `#1e1e1e`   | Terminal/logs dark background |
| `#2d2d2d`   | Terminal header background |

---

## 3. Typography

### Font Families

| Token      | Font Stack                    | Usage                        |
| ---------- | ----------------------------- | ---------------------------- |
| `sans`     | `DM Sans, sans-serif`        | Body text, UI elements       |
| `display`  | `Sora, sans-serif`           | Headings, brand elements     |

Both fonts are loaded from Google Fonts via `<link>` tags in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:...&family=Sora:...&display=swap" rel="stylesheet" />
```

### Font Weight Usage

| Weight | Tailwind Class   | Typical Usage             |
| ------ | ---------------- | ------------------------- |
| 300    | `font-light`     | Subtle text               |
| 400    | `font-normal`    | Body text                 |
| 500    | `font-medium`    | Navigation, labels        |
| 600    | `font-semibold`  | Buttons, emphasis         |
| 700    | `font-bold`      | Headings, card titles     |
| 800    | `font-extrabold` | Hero headings             |

### Text Scale

The application uses Tailwind's default text scale. Common sizes used:

| Class      | Size   | Usage                                  |
| ---------- | ------ | -------------------------------------- |
| `text-xs`  | 12px   | Badge counts, meta text                |
| `text-sm`  | 14px   | Navigation items, secondary text       |
| `text-base`| 16px   | Body text, form inputs                 |
| `text-lg`  | 18px   | Section headings                       |
| `text-xl`  | 20px   | Sub-headings                           |
| `text-2xl` | 24px   | Page titles                            |
| `text-3xl` | 30px   | Major headings, brand logo             |
| `text-4xl` | 36px   | Dashboard greeting (mobile)            |
| `text-6xl` | 60px   | Dashboard greeting (desktop)           |

---

## 4. Spacing and Layout

### Border Radius

Custom radius values extend Tailwind defaults:

| Token     | Value    | Usage                        |
| --------- | -------- | ---------------------------- |
| `xl`      | `1rem`   | Buttons, inputs              |
| `2xl`     | `1.5rem` | Cards, modals                |
| `3xl`     | `2rem`   | Large cards                  |

In-code, even larger radii are used via arbitrary values:
- `rounded-[1.5rem]` - Auth modal
- `rounded-[2.5rem]` - Dashboard discovery cards
- `rounded-full` - Circular elements, pill buttons

### Container Widths

- `max-w-7xl` (80rem/1280px): Standard content container
- `max-w-6xl`: Logs page container
- `max-w-4xl`: Dashboard header content
- `max-w-md` (28rem/448px): Onboarding page, auth modal
- `max-w-lg` (32rem/512px): Generic modals

### Responsive Breakpoints

Standard Tailwind breakpoints are used:

| Breakpoint | Min Width | Usage                                |
| ---------- | --------- | ------------------------------------ |
| `sm`       | 640px     | Mobile/tablet transition             |
| `md`       | 768px     | Tablet/desktop transition            |
| `lg`       | 1024px    | Desktop layout switches              |
| `xl`       | 1280px    | Wide desktop refinements             |

Key responsive patterns:
- Navbar: Hamburger menu below `lg`, full nav at `lg+`.
- Profile: Stacked sidebar above content below `md`, side-by-side at `md+`.
- Grids: 1-column at mobile, 2-column at `md`, 3-4 column at `lg/xl`.

---

## 5. Animation System

### Keyframe Animations

Defined in `tailwind.config.js`:

| Name          | Duration  | Easing           | Effect                           |
| ------------- | --------- | ---------------- | -------------------------------- |
| `fade-up`     | 0.6s      | ease-out         | Fade in from 30px below          |
| `fade-in`     | 0.6s      | ease-out         | Simple opacity fade              |
| `float`       | 6s        | ease-in-out      | Subtle vertical float (infinite) |
| `pulse-slow`  | 4s        | cubic-bezier     | Slow opacity pulse (infinite)    |
| `marquee`     | 45s       | linear           | Horizontal scroll (infinite)     |

### Transition Patterns

Components use Tailwind's transition utilities extensively:

| Usage                         | Classes                                            |
| ----------------------------- | -------------------------------------------------- |
| Color transitions             | `transition-colors`                                |
| All property transitions      | `transition-all`                                   |
| Opacity transitions           | `transition-opacity duration-300`                  |
| Transform transitions         | `transition-transform duration-500/700`            |
| Hover scale                   | `group-hover:scale-105`                            |
| Active press                  | `active:scale-90`                                  |
| Hover lift                    | `hover:-translate-y-1`                             |

### Entry Animations

Uses `animate-in` CSS classes (from an implicit utility or custom CSS):
- `animate-in fade-in zoom-in-95 duration-200` - Modals, dropdowns
- `animate-in slide-in-from-top-2` - Mobile menu

---

## 6. Reusable UI Components

### Button (`components/ui/Button.tsx`)

A polymorphic button with variant-based styling.

**Props:**

| Prop        | Type                                        | Default     |
| ----------- | ------------------------------------------- | ----------- |
| `variant`   | `"primary" \| "secondary" \| "outline" \| "ghost"` | `"primary"` |
| `className` | `string`                                    | `""`        |
| `...rest`   | `ButtonHTMLAttributes<HTMLButtonElement>`    | -           |

**Variant Styles:**

| Variant     | Visual                                              |
| ----------- | --------------------------------------------------- |
| `primary`   | Red background, white text, red hover                |
| `secondary` | Gray background, dark text, darker gray hover        |
| `outline`   | Border, transparent background, accent hover         |
| `ghost`     | No background, accent hover                          |

**Base Styles:**
- Inline flex, centered content
- `rounded-xl` (1rem) border radius  
- `h-10 px-4 py-2` default sizing
- Focus ring, disabled state handling

**Class Merging:**
Uses `cn()` utility (combining `clsx` + `tailwind-merge`) for safe class composition and override.

### Modal (`components/ui/Modal.tsx`)

A portal-based modal overlay.

**Props:**

| Prop        | Type                    | Description                |
| ----------- | ----------------------- | -------------------------- |
| `isOpen`    | `boolean`               | Visibility control         |
| `onClose`   | `() => void`            | Close callback             |
| `children`  | `ReactNode`             | Modal content              |
| `className` | `string`                | Additional content classes |

**Features:**
- Rendered via `createPortal` to `document.body`.
- Dark backdrop with blur (`bg-black/60 backdrop-blur-sm`).
- Click-outside-to-close (via overlay ref check).
- Escape key dismissal.
- Body scroll lock while open.
- Max height 90vh with scrollable content.
- Close button (top-right, circular, gray).
- Entry animation: `zoom-in-95 duration-200`.

---

## 7. Shadow System

The application uses both Tailwind default shadows and custom shadow definitions:

| Usage                  | Shadow Class                                                    |
| ---------------------- | --------------------------------------------------------------- |
| Cards (default)        | `shadow-sm`, `shadow-md`                                        |
| Cards (hover)          | `hover:shadow-lg`, `hover:shadow-xl`                            |
| Elevated dropdowns     | `shadow-[0_4px_20px_rgba(0,0,0,0.08)]`                         |
| CTA buttons            | `shadow-xl shadow-orange-500/25`                                |
| Primary button glow    | `shadow-lg shadow-primary/20`                                   |
| Counter element        | `shadow-xl shadow-orange-900/5`                                 |

---

## 8. Glassmorphism and Visual Effects

Several components use glassmorphism and advanced visual effects:

| Effect               | Implementation                                                  |
| -------------------- | --------------------------------------------------------------- |
| Glass card           | `bg-white/20 backdrop-blur-md border border-white/40`           |
| Auth modal overlay   | `bg-black/50 backdrop-blur-sm`                                  |
| Modal overlay        | `bg-black/60 backdrop-blur-sm`                                  |
| Gradient text        | `text-transparent bg-clip-text bg-gradient-to-r from-X to-Y`   |
| Gradient background  | `bg-gradient-to-t from-black/60 via-transparent to-transparent` |
| Spotlight effect     | Radial gradient following mouse position (DashboardHeader)      |
| Drop shadow text     | `drop-shadow-sm`, `drop-shadow-md`                              |

---

## 9. Scrollbar Customization

Two custom scrollbar utilities are defined in `index.css`:

### `custom-scrollbar`
A thin, styled scrollbar visible on content areas:
- Width: 6px
- Track: transparent
- Thumb: `#e2e8f0` (gray-200), 10px radius
- Hover thumb: `#cbd5e1` (gray-300)
- Firefox: `scrollbar-width: thin`

### `invisible-scrollbar`
A completely hidden scrollbar for seamless scroll areas:
- `-webkit-scrollbar: display: none`
- `-ms-overflow-style: none`
- `scrollbar-width: none`

Used in the auth modal and content overlays where scrollbars would break the visual design.

---

## 10. Icon System

All icons come from the `lucide-react` library. Icons are imported individually for tree-shaking:

```typescript
import { Send, Plus, Trash2, Search } from "lucide-react";
```

Common icon sizes:
- `w-3 h-3` - Inline meta icons
- `w-4 h-4` - Button icons, dropdown items
- `w-5 h-5` - Navigation icons, action buttons
- `w-6 h-6` - Mobile menu toggle
- `w-8 h-8` - Page header icons

Icons consistently use `strokeWidth` defaults except for specific emphasis cases (`strokeWidth={1.5}` for the user icon).
