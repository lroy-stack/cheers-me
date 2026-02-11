# Floor Plan Editor

## Overview

The Floor Plan Editor is an interactive drag-and-drop interface for managing restaurant table layouts. It allows managers to visually arrange tables, configure table properties, and organize tables into different sections (Terrace, Indoor, Bar, VIP).

## Features

### 1. **Drag-and-Drop Canvas**
- Interactive grid-based canvas with visual guidelines
- Drag tables to reposition them
- Real-time position tracking
- Restricted movement to keep tables within canvas bounds
- Visual feedback during drag operations

### 2. **Table Shapes**
Three table shape options:
- **Round**: Circular tables (typical for 2-4 people)
- **Square**: Square tables (flexible seating)
- **Rectangle**: Rectangular tables (ideal for larger groups)

### 3. **Table Status Colors**
Visual status indicators:
- 🟢 **Available** (Green): Ready for seating
- 🔴 **Occupied** (Red): Currently in use
- 🟡 **Reserved** (Amber): Reserved for a booking
- ⚪ **Cleaning** (Gray): Being cleaned/prepared

### 4. **Section Organization**
- Multiple floor sections (Terrace, Indoor, Bar, VIP)
- Tab-based navigation between sections
- Each section maintains its own table layout
- Tables are scoped to specific sections

### 5. **Table Properties Panel**
Edit table details in real-time:
- **Basic Info**: Table number, capacity, status
- **Appearance**: Shape, size (width/height), rotation angle
- **Settings**: Active/inactive toggle, internal notes
- **Position**: Real-time X/Y coordinates (read-only)

### 6. **Toolbar Actions**
- **Add Table**: Create new tables with dropdown shape selection
- **Save Layout**: Bulk save all table positions and properties
- **Auto-numbering**: Automatically generates sequential table numbers (T1, T2, T3...)

## Components

### `FloorPlanCanvas`
Main canvas component that renders the drag-and-drop area.

**Props:**
- `tables`: Array of table objects
- `onTableMove`: Callback when a table is dragged
- `onTableSelect`: Callback when a table is selected
- `selectedTable`: Currently selected table
- `className`: Optional CSS classes

**Features:**
- Grid background (20px × 20px)
- Empty state when no tables exist
- DnD context with pointer and keyboard sensors
- Drag overlay for smooth visual feedback

### `TableShape`
Renders individual table shapes with status colors.

**Props:**
- `shape`: 'round' | 'square' | 'rectangle'
- `status`: 'available' | 'occupied' | 'reserved' | 'cleaning'
- `capacity`: Number of seats
- `tableNumber`: Display label (e.g., "T1")
- `width`, `height`: Dimensions in pixels
- `rotation`: Rotation angle in degrees
- `isSelected`: Highlight selected state
- `isDragging`: Visual feedback during drag

### `DraggableTable`
Wrapper component that makes TableShape draggable using @dnd-kit.

**Features:**
- Absolute positioning based on x_position/y_position
- Click to select
- Drag to reposition
- Z-index management for selected tables

### `TablePropertiesPanel`
Side panel for editing table properties.

**Features:**
- React Hook Form + Zod validation
- Real-time auto-save (updates on change)
- Conditional fields (height only shows for rectangles)
- Delete button with confirmation
- Reset rotation button

### `FloorSectionTabs`
Tab navigation for switching between floor sections.

**Props:**
- `sections`: Array of floor section objects
- `activeSection`: Currently selected section ID
- `onSectionChange`: Callback when section changes

### `FloorPlanToolbar`
Top toolbar with actions.

**Features:**
- Add Table dropdown (select shape)
- Save button (highlights when unsaved changes exist)
- Loading states during save operation

## Usage

### Basic Flow

1. **Select a Section**: Click on a section tab (Terrace, Indoor, etc.)
2. **Add Tables**: Click "Add Table" → Choose shape → Table appears at (50, 50)
3. **Arrange Layout**: Drag tables to desired positions
4. **Configure Properties**: Click a table → Edit properties in side panel
5. **Save**: Click "Save Layout" to persist changes to database

### Keyboard Navigation

- **Arrow Keys**: Move selected table (when using keyboard sensor)
- **Tab**: Navigate between form fields in properties panel
- **Enter**: Submit forms

### API Integration

The floor plan editor integrates with:

- `GET /api/tables?section_id={id}`: Fetch tables for a section
- `POST /api/tables`: Create a new table
- `PUT /api/tables`: Bulk update table positions/properties
- `DELETE /api/tables/{id}`: Delete a table
- `GET /api/floor-sections`: Fetch all floor sections

### Data Model

```typescript
interface Table {
  id: string
  table_number: string        // e.g., "T1", "A5"
  capacity: number             // 1-20
  x_position: number           // Pixels from left
  y_position: number           // Pixels from top
  status: TableStatus
  shape: TableShapeType
  width?: number               // Default 80px
  height?: number              // Default 80px
  rotation?: number            // 0-360 degrees
  section_id?: string          // Foreign key to floor_sections
  is_active: boolean           // Show/hide table
}
```

## Technical Details

### Dependencies

- **@dnd-kit/core**: Drag-and-drop core functionality
- **@dnd-kit/utilities**: Transform utilities (CSS.Transform)
- **react-hook-form**: Form state management
- **zod**: Schema validation
- **shadcn/ui**: UI components (Button, Card, Input, Select, etc.)

### Performance Considerations

1. **Auto-save**: Currently saves on every change. In production, implement debouncing (e.g., 500ms delay) to reduce API calls.

2. **Bulk Updates**: The `PUT /api/tables` endpoint accepts an array of updates and processes them in a single transaction.

3. **Real-time Sync**: Consider implementing Supabase Realtime subscriptions for multi-user editing (to prevent conflicts).

4. **Canvas Size**: The canvas uses a minimum height of 600px but should adapt to section needs. Consider making this configurable per section.

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Touch support for mobile/tablet devices (via PointerSensor)
- Grid background uses CSS linear-gradients (IE11+ support)

## Future Enhancements

1. **Undo/Redo**: Implement history stack for layout changes
2. **Copy/Paste**: Duplicate table configurations
3. **Snap to Grid**: Align tables to grid points for cleaner layouts
4. **Collision Detection**: Prevent table overlap
5. **Zoom Controls**: Zoom in/out for large floor plans
6. **Background Image**: Upload floor plan image as canvas background
7. **Multi-Select**: Select and move multiple tables at once
8. **Templates**: Save and load pre-configured layouts
9. **Export/Import**: Export layout as JSON for backup/migration
10. **Mobile Optimizations**: Simplified UI for small screens

## Troubleshooting

### Tables don't appear
- Check that `section_id` matches the active section
- Verify `is_active` is `true`
- Ensure tables have valid `x_position` and `y_position` values

### Drag not working
- Check browser console for errors
- Verify @dnd-kit packages are installed
- Ensure PointerSensor activation distance is met (8px)

### Changes don't save
- Check network tab for API errors
- Verify RLS policies allow updates
- Ensure user has 'admin' or 'manager' role

### Properties panel doesn't update
- Verify `selectedTable` state is set correctly
- Check React Hook Form validation errors
- Ensure form values sync with table state

## Testing

### Manual Testing Checklist

- [ ] Create tables with all three shapes
- [ ] Drag tables to different positions
- [ ] Edit table properties (number, capacity, rotation)
- [ ] Switch between sections (verify tables are scoped correctly)
- [ ] Delete tables (with confirmation)
- [ ] Save layout (verify persistence after page reload)
- [ ] Test on mobile (touch drag)
- [ ] Test keyboard navigation

### E2E Test Scenarios

```typescript
// Example Playwright test
test('can create and arrange tables', async ({ page }) => {
  await page.goto('/reservations/floorplan')

  // Add a table
  await page.click('button:has-text("Add Table")')
  await page.click('text=Round Table')

  // Verify table appears
  await expect(page.locator('text=T1')).toBeVisible()

  // Drag table to new position
  await page.dragAndDrop('[data-table-id="..."]', { x: 200, y: 150 })

  // Save layout
  await page.click('button:has-text("Save Layout")')
  await expect(page.locator('text=Floor plan saved')).toBeVisible()
})
```

## Credits

Built with:
- Next.js 15 (App Router)
- @dnd-kit by Claudéric Demers
- shadcn/ui by shadcn
- React Hook Form + Zod
