# Frontend Design System SDD

## 1. Product identity

The frontend uses an original banking identity. It may use a warm yellow and neutral palette associated with financial services, but must not reproduce Bancolombia names, logos, proprietary fonts, illustrations, copy, exact screens or brand assets.

Working product name: `Aurora Banco`.

The implementation may replace this name only with another original name approved in the project configuration. No user-visible text may mention Bancolombia.

## 2. Tokens

Use CSS variables so the visual language is consistent and changeable:

```css
:root {
  --color-brand: #f2c94c;
  --color-brand-strong: #d9a900;
  --color-ink: #202124;
  --color-surface: #ffffff;
  --color-surface-muted: #f5f6f7;
  --color-border: #d9dde2;
  --color-success: #237a57;
  --color-warning: #a76500;
  --color-danger: #b42318;
  --color-info: #2457a6;
  --font-body: "Atkinson Hyperlegible", "Trebuchet MS", sans-serif;
  --radius-sm: 6px;
  --radius-md: 10px;
  --shadow-card: 0 8px 24px rgba(32, 33, 36, 0.08);
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}
```

The exact values may be adjusted, but dominant color, contrast and semantic meaning must remain consistent. Do not use purple gradients, copied banking logos or decorative visual noise.

## 3. Typography and layout

- Use a distinctive open font loaded locally or from an approved package.
- Headings communicate page purpose; avoid oversized marketing text.
- Body text must remain readable at mobile sizes.
- Use a constrained content width with a persistent navigation shell.
- Cards are reserved for products, summaries, alerts and focused tools; do not nest cards inside cards.
- Use visible focus rings and a minimum 44px interactive target.

## 4. Component contract

| Component | Required states | Required behavior |
|---|---|---|
| `Button` | idle, hover, focus, disabled, loading | prevents duplicate submit and exposes busy label |
| `Input` | empty, focused, invalid, disabled | label, hint, field error and keyboard focus |
| `Select` | empty, selected, invalid, disabled | exact backend enum values mapped to user labels |
| `Modal` | open, closing, submitting | focus trap, Escape handling and confirmation copy |
| `Alert` | info, success, warning, error | semantic icon plus text; never color alone |
| `Skeleton` | loading | stable dimensions matching final content |
| `EmptyState` | empty | explanation and next action |
| `ErrorState` | error | safe message, request id and retry |
| `StatusBadge` | every domain status | text plus semantic color/icon |
| `MoneyAmount` | positive, zero, negative/blocked | currency and locale formatting |
| `DataTable` | loading, rows, empty, error | responsive fallback and accessible headers |
| `DashboardCard` | loading, loaded, stale, error | title, value, status and action |

## 5. Responsive rules

- Mobile: single-column content, drawer navigation, stacked financial forms and horizontally scrollable data tables only when unavoidable.
- Tablet: two-column summaries and collapsible navigation.
- Desktop: persistent navigation, summary grid and readable max-width content.
- No text, amounts, buttons or status badges may overlap or overflow their container.
- Test at 360x800, 768x1024 and 1440x900 minimum.

## 6. Motion and reduced motion

Use meaningful animations only:

- page transition;
- dashboard card stagger;
- skeleton shimmer;
- success confirmation;
- modal entrance.

All animations must respect `prefers-reduced-motion: reduce` and become instant or minimal when enabled.

## 7. Accessibility gate

The frontend must verify:

- keyboard-only login and navigation;
- visible focus;
- labels associated with form fields;
- screen-reader names for icons and buttons;
- contrast for text and status states;
- error messages announced or associated with fields;
- no critical workflow depends only on color or animation.

## 8. Visual acceptance

For each role, capture desktop and mobile screenshots for:

1. login;
2. dashboard loading;
3. dashboard loaded;
4. empty collection;
5. form validation error;
6. backend error alert;
7. financial confirmation;
8. successful operation.

The screenshots must show the original product identity and no third-party brand assets.
