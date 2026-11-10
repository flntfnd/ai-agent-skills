# Design File Frames

Frame structure for Figma work. The structure is the rule. The numbers belong to one device. For a newer device, take them from the design tool's device preset.

## iPhone (393 x 852, iPhone 15 Pro / 16 class)

```
Frame: 393 x 852
  +-- Status Bar (59px, transparent -- content shows through)
  +-- Navigation / Large Title (inline, collapses on scroll)
  +-- ScrollView Content (fills edge-to-edge, extends behind status bar and tab bar)
  +-- Tab Bar (83px from bottom, glass material, above safe area)
      +-- Home Indicator Safe Area (34px)
```

Content frames run the full frame height. The glass chrome floats on top. It doesn't push content down. If content starts below the navigation bar and ends above the tab bar, the frame structure is wrong.

## iPad (1024 x 1366, iPad Pro 13")

```
Frame: 1024 x 1366
  +-- Status Bar (24px)
  +-- Sidebar (320px wide, glass treatment, full height of the window)
  +-- Detail / Content Area (704px wide, full height)
```

## Mac

The sidebar runs to the top, bottom, and side edge of the window frame. No inset, no corner radius of its own. The window's corner radius comes from the system window component, not a value typed into the frame.

## Foldable

Any two-pane screen needs flat, folded, and half-open frames for iPhone Duo. If the file doesn't have them, ask before building.
