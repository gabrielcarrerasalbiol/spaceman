# SPACEMAN - VISUAL DESIGN DOCUMENT
## Screen Mockups & UI Specifications

---

## 1. DESIGN SYSTEM OVERVIEW

### 1.1 Color Palette

#### Primary Colors
```
Brand Blue (Customizable):    #3B82F6 (default)
Success Green:                #22C55E
Warning Amber:                #F59E0B
Error Red:                    #EF4444
Info Blue:                    #3B82F6
```

#### Status Colors (Unit Availability)
```
Available (Green):    #22C55E
Reserved (Amber):     #F59E0B
Occupied (Blue):      #3B82F6
Maintenance (Red):    #EF4444
Inactive (Gray):      #6B7280
```

#### Theme Colors
```
Light Mode:
- Background: #FFFFFF
- Surface: #F9FAFB
- Border: #E5E7EB
- Text Primary: #111827
- Text Secondary: #6B7280

Dark Mode:
- Background: #111827
- Surface: #1F2937
- Border: #374151
- Text Primary: #F9FAFB
- Text Secondary: #9CA3AF
```

### 1.2 Typography

```
Font Family: Inter (system fallback)
Font Sizes:
- Heading 1: 2.25rem (36px)
- Heading 2: 1.875rem (30px)
- Heading 3: 1.5rem (24px)
- Body: 1rem (16px)
- Small: 0.875rem (14px)
- XSmall: 0.75rem (12px)
```

### 1.3 Spacing Scale

```
4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px
```

### 1.4 Border Radius

```
Small: 4px (buttons, inputs)
Medium: 8px (cards, modals)
Large: 12px (containers)
XL: 16px (special elements)
```

---

## 2. LAYOUT STRUCTURE

### 2.1 Dashboard Shell (Main Application Layout)

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (64px)                                                  │
│  ┌─────────────┐  Spaceman  ▾           User  ▾  Theme Toggle  │
│  │  Logo       │  Search                    Notifications      │
│  └─────────────┘                                                │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│ Sidebar  │  Main Content Area                                   │
│ (256px)  │  (flexible width, min 320px)                         │
│          │                                                      │
│ ┌──────┐ │  ┌────────────────────────────────────────────────┐ │
│ │Dashboard│  │  Breadcrumb: Home > Module > Submodule        │ │
│ ├──────┤ │  ├────────────────────────────────────────────────┤ │
│ │Locations│  │                                                │ │
│ ├──────┤ │  │  Page Header                                   │ │
│ │  Units  │  │  ┌──────────┐  Actions: [New] [Export]        │ │
│ ├──────┤ │  │  │ Title    │                                 │ │
│ │Clients  │  │  └──────────┘                                 │ │
│ ├──────┤ │  │                                                │ │
│ │Contracts│  │  Content Area                                  │ │
│ ├──────┤ │  │  ┌──────────────────────────────────────────┐  │ │
│ │WordPress│  │  │                                          │  │ │
│ ├──────┤ │  │  │  Dynamic Content (Lists, Forms, Editor)  │  │ │
│ │Settings │  │  │                                          │  │ │
│ └──────┘ │  │  └──────────────────────────────────────────┘  │ │
│          │  │                                                │ │
│          │  └────────────────────────────────────────────────┘ │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

**Specifications:**
- **Sidebar**: Fixed 256px width on desktop, collapsible to 72px (icons only) or 0px (mobile drawer)
- **Header**: Fixed 64px height, always visible
- **Main Content**: Scrollable area with padding 24px
- **Responsive**: 
  - Tablet (<1024px): Sidebar collapses to icons (72px)
  - Mobile (<768px): Sidebar becomes slide-out drawer

---

## 3. SCREEN MOCKUPS

### 3.1 Login Screen

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     ┌─────────────────────────┐                 │
│                     │                         │                 │
│                     │      [LOGO]            │                 │
│                     │     Spaceman           │                 │
│                     │  Self-Storage Mgmt     │                 │
│                     │                         │                 │
│                     │  ┌───────────────────┐ │                 │
│                     │  │ Email Address     │ │                 │
│                     │  └───────────────────┘ │                 │
│                     │                         │                 │
│                     │  ┌───────────────────┐ │                 │
│                     │  │ ••••••••••••••••  │ │                 │
│                     │  └───────────────────┘ │                 │
│                     │                         │                 │
│                     │  ┌───────────────────┐ │                 │
│                     │  │    Sign In        │ │  ← Primary Btn  │
│                     │  └───────────────────┘ │                 │
│                     │                         │                 │
│                     │  Forgot password?       │                 │
│                     │                         │                 │
│                     └─────────────────────────┘                 │
│                                                                 │
│              © 2026 Spaceman. All rights reserved.             │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- Centered card: 400px width, max 90% viewport
- Logo: 80px × 80px
- Input fields: Full width, 48px height
- Primary button: Full width, 48px height
- Background: Subtle gradient or pattern
- Theme toggle: Top-right corner

---

### 3.2 Dashboard Home

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │  Dashboard / Overview                                │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ Welcome back, Gabriel!                         │ │
│          │  │ Here's what's happening today.                 │ │
│          │  └────────────────────────────────────────────────┘ │
│          │                                                      │
│          │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│          │  │ 12       │ │ 156      │ │ 8        │ │ 3        ││
│          │  │Locations │ │   Units  │ │Contracts │ │Inactive  ││
│          │  │          │ │          │ │          │ │   Units  ││
│          │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│          │                                                      │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ Quick Actions                                  │ │
│          │  │ [+ New Location] [+ New Unit] [+ New Contract] │ │
│          │  └────────────────────────────────────────────────┘ │
│          │                                                      │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ Recent Activity                                │ │
│          │  │ • Created contract CTR-20260406-0001           │ │
│          │  │ • Updated unit 36Sq 5 to Occupied             │ │
│          │  │ • Added new location: London Central          │ │
│          │  └────────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────┘
```

**Statistics Cards:**
- Size: 240px × 120px
- Icon + Number + Label
- Clickable → navigates to relevant list

---

### 3.3 Locations List View

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                    [+ New Location] [Export]│
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │  Dashboard / Locations                               │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ Locations (12)              [List] [Map] ◀─────│ │
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ 🔍 Search locations...         [Filter ▾]       │ │
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ Name          │ Units │ Contracts │ Status │Actions│
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ London Cent.  │  25   │    18     │ Active │⋯│
│          │  │ Manchester    │  48   │    42     │ Active │⋯│
│          │  │ Birmingham   │  36   │    31     │ Active │⋯│
│          │  │ Leeds        │  22   │    15     │ Active │⋯│
│          │  │ Glasgow      │  18   │    12     │ Active │⋯│
│          │  │ Bristol      │  30   │    28     │ Active │⋯│
│          │  │ Liverpool    │   0   │     0     │ Inactive│⋯│
│          │  │ ...                                                  │
│          │  └────────────────────────────────────────────────┘ │
│          │                                    < 1 2 3 4 >       │
└──────────┴──────────────────────────────────────────────────────┘
```

**Table Specifications:**
- Row height: 56px
- Sortable columns (click header)
- Status badges: Green (Active), Gray (Inactive)
- Actions menu: Edit, View Map, Delete
- Pagination: 20 items per page

---

### 3.4 Location Detail - Areas Tab (Visual Designer)

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                   [Save] [Cancel] [Edit Mode]│
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │  Dashboard / Locations / London Central / Edit        │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ [Details] [Areas ◀────────────────────]         │ │
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ Areas: [Ground Floor ▾] [+ New Area]           │ │
│          │  └────────────────────────────────────────────────┘ │
│          │                                                      │
│          │  ┌──────────────┬──────────────────────────────────┐ │
│          │  │              │                                  │ │
│          │  │   UNITS      │      CANVAS AREA                 │ │
│          │  │              │      (1400 × 820)                │ │
│          │  │ ┌──────────┐ │  ┌──────────────────────────────┐│ │
│          │  │ │ 36Sq     │ │  │                              ││ │
│          │  │ │ 25Sq     │ │  │    [Background Image]        ││ │
│          │  │ │ 50Sq     │ │  │                              ││ │
│          │  │ │ 100Sq    │ │  │  ┌───┐ ┌───┐ ┌────┐         ││ │
│          │  │ │ 200Sq    │ │  │  │36S│ │50S│ │100S│         ││ │
│          │  │ └──────────┘ │  │  │1  │ │1  │ │1   │         ││ │
│          │  │              │  │  └───┘ └───┘ └────┘         ││ │
│          │  │   Available: 5│  │                              ││ │
│          │  │   Reserved: 2│  │  ┌────────┐ ┌──────┐        ││ │
│          │  │   Occupied: 8│  │  │  36Sq  │ │100Sq │        ││ │
│          │  │   Maintenance│  │  │   2    │ │ 2    │        ││ │
│          │  │              │  │  └────────┘ └──────┘        ││ │
│          │  │   Drag units │  │                              ││ │
│          │  │   to canvas  │  │                              ││ │
│          │  │              │  │                              ││ │
│          │  └──────────────┘  └──────────────────────────────┘│ │
│          │                                                      │
│          │  Zoom: [─] 100% [+]  [Fit] [Reset]                  │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

**CANVAS CONTROLS (Edit Mode):**

```
When unit is selected:
┌──────────────────────────────────────┐
│ Selected: 36Sq 1                     │
│ ┌────────────────────────────────┐  │
│ │  ┌────┐                         │  │
│ │  │ 36 │ ← Selected with handles │  │
│ │  │ Sq │    ▢      ▢            │  │
│ │  │  1 │    ◯      ▢            │  │
│ │  └────┘    Rotation handle      │  │
│ │            Resize handles        │  │
│ └────────────────────────────────┘  │
│                                      │
│ Actions:                             │
│ • Delete (Del key)                   │
│ • Bring to Front                     │
│ • Send to Back                       │
│ • Duplicate                          │
│ • Link Contract...                   │
└──────────────────────────────────────┘
```

**UNIT COLORS (Status Indication):**

```
┌────────────────────────────────────────────┐
│ Legend:                                    │
│                                            │
│ ███ Available  (Green: #22C55E)            │
│ ███ Reserved    (Amber: #F59E0B)            │
│ ███ Occupied    (Blue: #3B82F6)             │
│ ███ Maintenance (Red: #EF4444)              │
│ ███ Inactive    (Gray: #6B7280)             │
└────────────────────────────────────────────┘
```

**UNIT SIDEBAR:**

```
┌──────────────────────────┐
│ Units (15)               │
│ ─────────────────────────│
│ 🔍 Search...             │
│ ─────────────────────────│
│ Available (5)            │
│ ┌──────────────────────┐ │
│ │ 36Sq 1              │ │
│ │ 36 sq ft • Indoor   │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 36Sq 2              │ │
│ │ 36 sq ft • Indoor   │ │
│ └──────────────────────┘ │
│ ...                        │
│ Reserved (2)             │
│ Occupied (8)             │
│ Maintenance (0)          │
└──────────────────────────┘
```

**CANVAS TOOLBAR:**

```
┌───────────────────────────────────────────────────────────┐
│ [Select] [Rectangle] [Pan] [Zoom In] [Zoom Out] [Undo] [Redo]│
│                                                           │
│ Grid: [◻] Snap: [◻]                                      │
│ Background: [Upload...] [URL...] [Clear]                  │
└───────────────────────────────────────────────────────────┘
```

---

### 3.5 Units List View

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                  [+ New Unit] [Bulk Create][Export]│
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │  Dashboard / Units                                   │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ Units (156)                     Location: [All ▾]│
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ 🔍 Search units...              [Filter ▾]      │ │
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ Code    │Loc.    │ Size │ Rate  │ Status  │Actions│
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ 36Sq 1  │London  │ 36   │ £85  │ Occupy │⋯│
│          │  │ 36Sq 2  │London  │ 36   │ £85  │ Avail  │⋯│
│          │  │ 50Sq 1  │London  │ 50   │ £120 │ Occupy │⋯│
│          │  │ 100Sq 1 │Manch.  │ 100  │ £200 │ Reserve│⋯│
│          │  │ 200Sq 1 │Glasgow │ 200  │ £380 │ Maint  │⋯│
│          │  │ ...                                                  │
│          │  └────────────────────────────────────────────────┘ │
│          │                                    < 1 2 3 4 5 6 7 8 > │
└──────────┴──────────────────────────────────────────────────────┘
```

**Bulk Unit Creation Modal:**

```
┌─────────────────────────────────────────┐
│  Bulk Unit Generator                     │
├─────────────────────────────────────────┤
│  Location: [London Central ▾]           │
│                                          │
│  Add Unit Templates:                     │
│  ┌─────────────────────────────────────┐│
│  │ Size (sq ft): [36]                  ││
│  │ Quantity:    [10]                   ││
│  │ Type:        [Standard ▾]          ││
│  │ Features:     [◻] Indoor [◻] 24h    ││
│  │              [◻] Drive-up           ││
│  │ [+ Add Template]                    ││
│  └─────────────────────────────────────┘│
│                                          │
│  Templates to create:                    │
│  • 36Sq (10 units)                       │
│  • 50Sq (5 units)                        │
│  • 100Sq (3 units)                       │
│                                          │
│  Total: 18 units                         │
│                                          │
│  [Cancel]              [Generate Units] │
└─────────────────────────────────────────┘
```

---

### 3.6 Contracts List View

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                     [+ New Contract] [Export]│
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │  Dashboard / Contracts                                │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ Contracts (45)                Status: [All ▾]  ││
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ 🔍 Search contracts...          [Filter ▾]      │ │
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ Contract #  │ Client      │ Unit   │ Status│Actions│
│          │  ├────────────────────────────────────────────────┤ │
│          │  │ CTR-20260406│ John Smith │ 36Sq 1 │ Active│⋯│
│          │  │ CTR-20260405│ Sarah Jones │ 50Sq 1 │ Active│⋯│
│          │  │ CTR-20260404│ Mike Brown  │ 100Sq 1│ Draft │⋯│
│          │  │ CTR-20260403│ Emma Wilson │ 200Sq 1│ Active│⋯│
│          │  │ ...                                                  │
│          │  └────────────────────────────────────────────────┘ │
│          │                                    < 1 2 3 4 5 >    │
└──────────┴──────────────────────────────────────────────────────┘
```

**Contract Detail View:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Contracts                              [Edit] [Delete]│
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │  Contracts / CTR-20260406-0001                       │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ Contract Details                                │ │
│          │  ├────────────────────────────────────────────────┤ │
│          │  │                                                │ │
│          │  │ Contract Number: CTR-20260406-0001            │ │
│          │  │ Status: ● Active                               │ │
│          │  │                                                │ │
│          │  │ Client:                                       │ │
│          │  │ John Smith                                    │ │
│          │  │ john@example.com                              │ │
│          │  │ [+ View Client Details]                       │ │
│          │  │                                                │ │
│          │  │ Unit:                                         │ │
│          │  │ 36Sq 1 - London Central                       │ │
│          │  │ 36 sq ft • Indoor                             │ │
│          │  │ [+ View Unit Details]                         │ │
│          │  │                                                │ │
│          │  │ Dates:                                        │ │
│          │  │ Start: 06/04/2026                             │ │
│          │  │ End: 06/04/2027                               │ │
│          │  │                                                │ │
│          │  │ Billing:                                      │ │
│          │  │ Weekly Rate: £85                              │ │
│          │  │ Monthly Rate: £340                            │ │
│          │  │ Billing Day: 1st of month                     │ │
│          │  │ Deposit: £170                                 │ │
│          │  │                                                │ │
│          │  │ Payment Method: Bank Transfer                 │ │
│          │  │                                                │ │
│          │  │ Notes:                                        │ │
│          │  │ Client requested climate control...           │ │
│          │  │                                                │ │
│          │  │ Activity:                                     │ │
│          │  │ • 06/04/2026 - Contract created               │ │
│          │  │ • 06/04/2026 - Unit marked as Occupied        │ │
│          │  │                                                │ │
│          │  └────────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────┘
```

---

### 3.7 Clients List View (Card-Based Layout)

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │  Dashboard / Clients                                 │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ Clients                    82 clients    [+ New │ │
│          │  │                                    Client]     │ │
│          │  └────────────────────────────────────────────────┘ │
│          │                                                      │
│          │  ┌────────────────┬──────────────────────────────┐ │
│          │  │                │                              │ │
│          │  │  FILTERS       │      CLIENT CARDS GRID       │ │
│          │  │                │                              │ │
│          │  │ ┌────────────┐ │  ┌─────────────────────┐     │ │
│          │  │ │ 🔍 Search  │ │  │ John Smith          │     │ │
│          │  │ │ clients... │ │  │                     │     │ │
│          │  │ └────────────┘ │  │ ● Active            │     │ │
│          │  │                │  │                     │     │ │
│          │  │ Status         │  │ john@example.com    │     │ │
│          │  │ □ All (82)     │  │ +44 20 1234 5678    │     │ │
│          │  │ ☑ Active (45)  │  │                     │     │ │
│          │  │ ☑ Inactive (28)│  │ 📄 3 contracts      │     │ │
│          │  │ □ Lead (9)     │  │                     │     │ │
│          │  │                │  │ [View] [Edit] [⋯]   │     │ │
│          │  │ Date Range     │  └─────────────────────┘     │ │
│          │  │ [From] [To]    │                              │ │
│          │  │                │  ┌─────────────────────┐     │ │
│          │  │ Has Contracts  │  │ Sarah Jones         │     │ │
│          │  │ □ Any          │  │                     │     │ │
│          │  │ ☑ Yes         │  │ ● Active            │     │ │
│          │  │ □ No          │  │                     │     │ │
│          │  │                │  │ sarah@example.com   │     │ │
│          │  │ Location       │  │ +44 20 2345 6789    │     │ │
│          │  │ [All ▾]        │  │                     │     │ │
│          │  │                │  │ 📄 1 contract       │     │ │
│          │  │ [Reset Filters]│  │                     │     │ │
│          │  │                │  │ [View] [Edit] [⋯]   │     │ │
│          │  └────────────────┘  └─────────────────────┘     │ │
│          │                      ┌─────────────────────┐     │ │
│          │                      │ Mike Brown          │     │ │
│          │                      │ Acme Corp           │     │ │
│          │                      │                     │     │ │
│          │                      │ ○ Inactive          │     │ │
│          │                      │                     │     │ │
│          │                      │ mike@acme.com       │     │ │
│          │                      │ +44 20 3456 7890    │     │ │
│          │                      │                     │     │ │
│          │                      │ 📄 0 contracts      │     │ │
│          │                      │                     │     │ │
│          │                      │ [View] [Edit] [⋯]   │     │ │
│          │                      └─────────────────────┘     │ │
│          │                      ┌─────────────────────┐     │ │
│          │                      │ Emma Wilson         │     │ │
│          │                      │                     │     │ │
│          │                      │ ◐ Lead              │     │ │
│          │                      │                     │     │ │
│          │                      │ emma@example.com    │     │ │
│          │                      │ +44 20 4567 8901    │     │ │
│          │                      │                     │     │ │
│          │                      │ 📄 0 contracts      │     │ │
│          │                      │                     │     │ │
│          │                      │ [View] [Edit] [⋯]   │     │ │
│          │                      └─────────────────────┘     │ │
│          │                                                │ │
│          │                      < 1 2 3 4 5 >              │ │
│          │                                                │ │
│          └────────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────┘
```

**Card Specifications:**
- **Card Size**: 320px width, auto height
- **Card Layout**: 
  - Padding: 20px
  - Border radius: 12px
  - Subtle shadow (elevation)
  - Hover effect: Slight lift (scale 1.02)
  - Background: White (light mode) / Surface (dark mode)
- **Grid**: Responsive - 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
- **Card Content**:
  - Client name: 20px, bold, primary color
  - Company name: 16px, secondary color (if applicable)
  - Status badge: Top-right corner, colored dot + text
  - Email: 14px, with icon
  - Phone: 14px, with icon
  - Contract count: 14px, with folder icon
  - Action buttons: Bottom, aligned right
- **Status Badges**:
  - Active: ● Green (#22C55E)
  - Inactive: ○ Gray (#6B7280)
  - Lead: ◐ Amber (#F59E0B)

**Left Filter Sidebar:**
- **Width**: 280px
- **Position**: Sticky, scrolls independently
- **Search Input**: Full width, 40px height
- **Filter Sections**: 
  - Status (checkboxes)
  - Date Range (date inputs)
  - Has Contracts (radio buttons)
  - Location (dropdown)
- **Reset Button**: Full width, secondary style
- **Apply Filters**: Auto-applies on selection change

---

### 3.8 Settings Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │  Dashboard / Settings                                │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ [Site Settings] [Profile] [Security]            │ │
│          │  ├────────────────────────────────────────────────┤ │
│          │  │                                                │ │
│          │  │ Site Settings                                  │ │
│          │  │ ─────────────────────                          │ │
│          │  │                                                │ │
│          │  │ Platform Name:                                  │ │
│          │  │ [Spaceman                                      ]│ │
│          │  │                                                │ │
│          │  │ Description:                                   │ │
│          │  │ [Self-Storage Management Platform              ]│ │
│          │  │                                                │ │
│          │  │ Logo:                                          │ │
│          │  │ [Choose File] No file chosen                   │ │
│          │  │                                                │ │
│          │  │ Brand Colour:                                  │ │
│          │  │ [█] #3B82F6                                    │ │
│          │  │                                                │ │
│          │  │ [Cancel]                      [Save Changes]   │ │
│          │  │                                                │ │
│          │  └────────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────┘
```

---

## 4. COMPONENT SPECIFICATIONS

### 4.1 Button Component

```
Primary Button:
┌─────────────────────┐
│     Button Text     │  Height: 40px
└─────────────────────┘  Padding: 12px 24px
                        Background: Brand colour
                        Text: White
                        Radius: 6px

Secondary Button:
┌─────────────────────┐
│     Button Text     │  Height: 40px
└─────────────────────┘  Padding: 12px 24px
                        Background: Transparent
                        Border: 1px solid
                        Radius: 6px

Danger Button:
┌─────────────────────┐
│     Delete          │  Height: 40px
└─────────────────────┘  Padding: 12px 24px
                        Background: Error red
                        Text: White
                        Radius: 6px
```

### 4.2 Input Component

```
Text Input:
┌─────────────────────────────────┐
│ Placeholder text...             │  Height: 40px
└─────────────────────────────────┘  Padding: 10px 14px
                                     Border: 1px solid
                                     Radius: 6px

Focused State:
┌─────────────────────────────────┐
│ Text being typed...        │  Border: 2px solid
└─────────────────────────────────┘  Focus ring: Brand colour
                                     Radius: 6px

Error State:
┌─────────────────────────────────┐
│ Invalid input             │  Border: 2px solid red
└─────────────────────────────────┘  Error message below
                                     This field is required
```

### 4.3 Card Component

```
Standard Card:
┌──────────────────────────────────────┐
│  Card Title                    [⋯]   │  Padding: 20px
├──────────────────────────────────────┤  Border: 1px solid
│                                      │  Radius: 8px
│  Card content goes here...           │  Shadow: subtle
│                                      │
│  More content...                     │
└──────────────────────────────────────┘

Statistics Card:
┌──────────────┐
│      156     │  Size: 240px × 120px
│    Units     │  Padding: 20px
│              │  Centered content
└──────────────┘  Large number + label
```

Client Card:
┌─────────────────────────────────┐
│ John Smith          ● Active    │  Size: 320px × auto
│                                 │  Padding: 20px
│ john@example.com               │  Border radius: 12px
│ +44 20 1234 5678               │  Shadow: elevation 2
│                                 │  Hover: elevation 4
│ 📄 3 contracts                 │
│                                 │
│              [View] [Edit] [⋯]  │
└─────────────────────────────────┘

Client Card (with company):
┌─────────────────────────────────┐
│ Sarah Jones        ● Active     │
│ Acme Corporation                │  Company name: 16px
│                                 │  Secondary color
│ sarah@acme.com                 │
│ +44 20 2345 5678               │
│                                 │
│ 📄 1 contract                  │
│                                 │
│              [View] [Edit] [⋯]  │
└─────────────────────────────────┘

Client Card (Lead status):
┌─────────────────────────────────┐
│ Emma Wilson        ◐ Lead       │
│                                 │
│ emma@example.com               │  Lead status: Amber
│ +44 20 4567 8901               │
│                                 │
│ 📄 0 contracts                 │  No contracts shown
│                                 │
│              [View] [Edit] [⋯]  │
└─────────────────────────────────┘
```

**Client Card Component Details:**

**Content Structure:**
```
Header Row:
  [Client Name]          [Status Badge]
  - 20px, bold           - Colored dot + text
  - Primary color        - 14px, medium weight
  - Truncate if long     - Right aligned

Company Row (optional):
  - 16px, regular
  - Secondary color
  - Only if company name exists

Contact Info:
  📧 Email: 14px, with icon
  📞 Phone: 14px, with icon
  - Secondary color
  - Truncate with tooltip

Stats Row:
  📄 X contracts
  - Icon + count + label
  - 14px
  - Primary color

Actions Row:
  - Right aligned
  - View (text button)
  - Edit (text button)
  - More (icon button: ⋯)
```

**Hover States:**
```
Normal:
  Shadow: elevation 2
  Scale: 1.0

Hover:
  Shadow: elevation 4
  Scale: 1.02
  Duration: 150ms
  Easing: ease-out

Active (click):
  Scale: 0.98
  Duration: 100ms
```

**Responsive Behavior:**
```
Desktop (≥1024px):
  Grid: 3 columns
  Card width: 320px
  Gap: 24px

Tablet (768px - 1023px):
  Grid: 2 columns
  Card width: calc(50% - 12px)
  Gap: 24px

Mobile (<768px):
  Grid: 1 column
  Card width: 100%
  Gap: 16px
```

**Status Variants:**
```
Active:
  Badge: ● Active
  Color: #22C55E (Green)
  Background: Light green tint

Inactive:
  Badge: ○ Inactive
  Color: #6B7280 (Gray)
  Background: Light gray tint

Lead:
  Badge: ◐ Lead
  Color: #F59E0B (Amber)
  Background: Light amber tint
```

---

### 4.4 Modal Component

```
Modal Overlay:
┌────────────────────────────────────────┐
│                                        │
│   ┌────────────────────────────────┐  │
│   │  Modal Title              [×]  │  │
│   ├────────────────────────────────┤  │
│   │                                │  │
│   │  Modal content...              │  │
│   │                                │  │
│   │  [Cancel]        [Confirm]     │  │
│   │                                │  │
│   └────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘

Overlay: 50% opacity black
Modal: Max width 600px, centered
Radius: 12px
Shadow: large
```

### 4.5 Table Component

```
Data Table:
┌──────────────────────────────────────────────────┐
│ Name          │ Status  │ Created    │ Actions  │  ← Header row
├──────────────────────────────────────────────────┤
│ Item 1        │ Active  │ 01/01/2026  │ [⋯]     │  ← Data row
│ Item 2        │ Inactive│ 02/01/2026  │ [⋯]     │  ← Data row
├──────────────────────────────────────────────────┤
│ Item 3        │ Active  │ 03/01/2026  │ [⋯]     │  ← Data row
└──────────────────────────────────────────────────┘

Row height: 56px
Header: Sticky, bold text
Stripes: Alternating row colors (subtle)
Hover: Light background tint
Sort: Clickable header with sort icon
```

---

## 5. VISUAL AREA DESIGNER - DETAILED SPECIFICATIONS

### 5.1 Canvas Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│ Areas: [Ground Floor ▾]  [+ New Area]    [Save Layout] [Reset]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐│
│  │                                                               ││
│  │                        CANVAS (1400×820)                      ││
│  │                                                               ││
│  │   ┌───┐      ┌─────┐            ┌──────────┐                ││
│  │   │36S│      │50S  │            │  100Sq   │                ││
│   │   │1  │      │1    │            │    1     │                ││
│  │   └───┘      └─────┘            └──────────┘                ││
│  │    ●          ●                     ●                         ││
│  │  Origin    Handle              Handle                        ││
│  │                                                               ││
│  │                                                               ││
│  │  ┌─────────────────────────────────────────────────────┐     ││
│  │  │                                                     │     ││
│  │  │   [Transform Box - Selected Unit]                   │     ││
│  │  │   ┌───────┐                                        │     ││
│  │  │   │       │         ▢                             │     ││
│  │  │   │ 36Sq  │─────────▢  Rotation Handle            │     ││
│  │   │   │   1   │         ▢                             │     ││
│  │  │   └───────┘                                        │     ││
│  │  │     ▢     ▢                                        │     ││
│  │  │   Resize Handles                                   │     ││
│  │  └─────────────────────────────────────────────────────┘     ││
│  │                                                               ││
│  └───────────────────────────────────────────────────────────────┘│
│                                                                     │
│  Zoom: [─] 100% [+]  [Fit to Screen] [Actual Size]                │
│  [Grid: ◻] [Snap: ◻] [Undo] [Redo]                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Unit States on Canvas

```
AVAILABLE UNIT:
┌─────────────────┐
│                 │
│     36Sq 1      │  Background: #22C55E (Green)
│    36 sq ft     │  Text: White
│                 │  Border: None
└─────────────────┘

RESERVED UNIT:
┌─────────────────┐
│                 │
│     36Sq 2      │  Background: #F59E0B (Amber)
│    36 sq ft     │  Text: White
│                 │  Border: None
└─────────────────┘

OCCUPIED UNIT:
┌─────────────────┐
│                 │
│     50Sq 1      │  Background: #3B82F6 (Blue)
│    50 sq ft     │  Text: White
│   John S.       │  Border: None
└─────────────────┘

MAINTENANCE UNIT:
┌─────────────────┐
│                 │
│     100Sq 1     │  Background: #EF4444 (Red)
│   100 sq ft     │  Text: White
│   Maintenance   │  Border: None
└─────────────────┘

INACTIVE UNIT:
┌─────────────────┐
│                 │
│     200Sq 1     │  Background: #6B7280 (Gray)
│   200 sq ft     │  Text: White
│    Inactive     │  Border: None
└─────────────────┘

SELECTED UNIT (Edit Mode):
┌─────────────────┐
│  ▢    ▢    ▢   │
│  └──────────────│
│  │    36Sq 1    │  Blue selection border
│  │   36 sq ft   │  Resize handles (▢)
│  ▢              │  Rotation handle (◯)
│  ▢    ◯        │  2px border
└─────────────────┘
```

### 5.3 Canvas Interactions

```
DRAG OPERATION:
┌─────────────────────────────────────────┐
│                                         │
│        [Dragging Unit]                  │
│            ┌─────┐                     │
│            │36Sq 1│ ← Following cursor │
│            └─────┘                     │
│                                         │
│     Drop zone highlighted              │
└─────────────────────────────────────────┘

RESIZE OPERATION:
┌─────────────────────────────────────────┐
│                                         │
│       ┌─────────────────────┐          │
│       │                     │          │
│       │      36Sq 1         │          │
│       │                     │          │
│       └─────────────────────┘          │
│                 ▲                      │
│                 │                      │
│               Handle                   │
│            [Resizing]                  │
└─────────────────────────────────────────┘

ROTATE OPERATION:
┌─────────────────────────────────────────┐
│                                         │
│           ┌─────────┐                  │
│           │  36Sq 1  │                  │
│           └────▲────┘                  │
│                │                       │
│              ◯ 45°                     │
│          [Rotation Handle]             │
└─────────────────────────────────────────┘
```

### 5.4 Unit Sidebar (Draggable Units)

```
┌──────────────────────────────┐
│ UNITS (15)                   │
│ ─────────────────────────    │
│ [🔍 Search units...]        │
│ ─────────────────────────    │
│ ▼ Available (8)             │
│   ┌────────────────────┐     │
│   │ 36Sq 1            │     │
│   │ 36 sq ft • Indoor │     │
│   └────────────────────┘     │
│   ┌────────────────────┐     │
│   │ 36Sq 2            │     │
│   │ 36 sq ft • Indoor │     │
│   └────────────────────┘     │
│   ...                         │
│ ▼ Reserved (3)              │
│   ┌────────────────────┐     │
│   │ 50Sq 1             │     │
│   │ 50 sq ft • Indoor  │     │
│   └────────────────────┘     │
│ ▼ Occupied (4)              │
│   ┌────────────────────┐     │
│   │ 100Sq 1            │     │
│   │ 100 sq ft • Indoor │     │
│   │ John Smith         │     │
│   └────────────────────┘     │
└──────────────────────────────┘

Width: 280px
Item height: 60px
Collapsible sections
Drag handle on each item
```

---

## 6. RESPONSIVE DESIGN BREAKPOINTS

### 6.1 Desktop (≥1024px)

```
- Full sidebar: 256px
- Two-column layouts
- Horizontal tables
- Canvas: Full width
```

### 6.2 Tablet (768px - 1023px)

```
- Icon-only sidebar: 72px
- Stacked cards instead of tables
- Horizontal scrolling for wide tables
- Canvas: Reduced margins
```

### 6.3 Mobile (<768px)

```
- Hidden sidebar (drawer)
- Single column layouts
- Card-based tables
- Vertical stacking
- Touch-optimized controls (44px min)
- Canvas: Pan and zoom required
```

---

## 7. ACCESSIBILITY CONSIDERATIONS

### 7.1 Color Contrast
- All text meets WCAG AA standards (4.5:1)
- Status indicators use icons + color
- Focus indicators on all interactive elements

### 7.2 Keyboard Navigation
- Tab order follows visual layout
- Escape closes modals
- Arrow keys navigate lists
- Canvas keyboard shortcuts documented

### 7.3 Screen Reader Support
- Semantic HTML elements
- ARIA labels for icons
- Alt text for images
- Live regions for dynamic updates

---

## 8. ANIMATION & INTERACTION

### 8.1 Micro-interactions

```
Button Hover:
- Scale: 1.02
- Duration: 150ms
- Easing: ease-out

Button Click:
- Scale: 0.98
- Duration: 100ms
- Easing: ease-in

Modal Open:
- Fade in + Scale up
- Duration: 200ms
- Easing: ease-out

Page Transition:
- Fade in
- Duration: 300ms
- Easing: ease-in-out
```

### 8.2 Canvas Animations

```
Unit Selection:
- Border fade in: 150ms
- Scale pulse: 200ms

Unit Drag:
- Shadow elevation increase
- Scale: 1.05
- Duration: 100ms

Unit Drop:
- Scale return: 100ms
- Shadow return: 100ms
```

---

## 9. ICON LIBRARY

### 9.1 Primary Icons (Lucide React)

```
Navigation:
- Home, Map, Settings, Users, FileText, Box, Building

Actions:
- Plus, Edit, Trash, Search, Filter, Download, Upload

Status:
- CheckCircle, XCircle, AlertCircle, Clock, User

UI:
- Menu, X, ChevronDown, ChevronLeft, ChevronRight
- Sun, Moon, LogOut, Bell
```

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Next Review:** Upon design system updates