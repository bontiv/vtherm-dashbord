# Theming

The dashboard looks like the Home Assistant theme of the user: it has no color of its own, and it follows a change of theme
without reloading. A plugin should do the same. Audience: plugin authors.

## Use the variables of the theme

Home Assistant sets CSS custom properties on the page, and custom properties go through the Shadow DOM of your components.
Use them in your styles and never write a color:

```css
:host {
  color: var(--primary-text-color);
  background-color: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: var(--ha-card-border-radius, 12px);
}
a {
  color: var(--primary-color);
}
```

A fallback is only useful for a size or a shadow. Do not give a color as a fallback: it would show in the wrong theme.

## The variables that the dashboard uses

These are the variables that the components of the dashboard use. They are defined by Home Assistant, so they exist in every theme.

| Variable | Use |
| --- | --- |
| `--primary-color` | Accent: links, the current page of a menu. |
| `--primary-text-color` | Text. |
| `--secondary-text-color` | Secondary text: headings of a group, hints. |
| `--text-primary-color` | Text on an accent or warning background. |
| `--primary-background-color` | Background of the page. |
| `--secondary-background-color` | Background under the pointer, in a menu. |
| `--card-background-color` | Background of a card, a menu and a widget. |
| `--divider-color` | Borders and separators. |
| `--app-header-background-color` | Background of the top bar. |
| `--app-header-text-color` | Text of the top bar. |
| `--error-color` | Errors. |
| `--warning-color` | Warnings. |
| `--success-color` | Success. |
| `--ha-card-border-radius` | Rounded corners of a card. |
| `--ha-card-box-shadow` | Shadow of a card. |
| `--paper-font-body1_-_font-family` | Font of the text. |

## Other things to do

- Use the elements of Home Assistant when they exist, such as `ha-icon` for an icon (`mdi:...`), so that your plugin looks the same.
- Make sure that your plugin is readable in a light and in a dark theme, and in a theme with other colors. Test with the three.
- The text of a plugin comes from its [translation catalogs](internationalization.md), and its size follows the font of the theme.
