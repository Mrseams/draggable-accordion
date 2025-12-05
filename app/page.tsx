"use client"

import { useState, useCallback } from "react"
import { DraggableMenu, type MenuItem } from "@/components/draggable-menu"

const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: "about",
    label: "About Us",
  },
  {
    id: "collections",
    label: "Collections",
    children: [
      { id: "spring", label: "Spring" },
      { id: "summer", label: "Summer" },
      { id: "fall", label: "Fall" },
      { id: "winter", label: "Winter" },
    ],
  },
  {
    id: "account",
    label: "My Account",
    children: [
      { id: "addresses", label: "Addresses" },
      { id: "orders", label: "Order History" },
    ],
  },
  {
    id: "home",
    label: "Home",
  },
]

export default function Home() {
  const [menuItems, setMenuItems] = useState(INITIAL_MENU_ITEMS)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["collections", "account"]))

  const handleItemsChange = useCallback((newItems: MenuItem[]) => {
    setMenuItems(newItems)
  }, [])

  const handleRemoveItem = useCallback((id: string) => {
    setMenuItems((prevItems) => removeItemById(prevItems, id))
  }, [])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Draggable Menu</h1>
          <p className="text-muted-foreground mb-4">
            Drag items to reorder. Drop at the top/bottom edge to place before/after, or drop in the middle to nest as a
            child.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-2 py-1 bg-muted rounded">Drag to edges = reorder</span>
            <span className="px-2 py-1 bg-muted rounded">Drag to center = nest inside</span>
            <span className="px-2 py-1 bg-muted rounded">Click chevron = expand/collapse</span>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <DraggableMenu
            items={menuItems}
            onItemsChange={handleItemsChange}
            onRemoveItem={handleRemoveItem}
            onToggleExpand={handleToggleExpand}
            expandedItems={expandedItems}
            showDragHandle={true}
            showRemoveButton={true}
            className="space-y-1"
          />
        </div>

        {/* Debug info */}
        <div className="mt-8 p-4 bg-muted rounded-lg border border-border">
          <h2 className="font-semibold mb-2">Current Structure:</h2>
          <pre className="text-sm overflow-auto max-h-64">{JSON.stringify(menuItems, null, 2)}</pre>
        </div>
      </div>
    </main>
  )
}

// Helper function to remove items recursively
function removeItemById(items: MenuItem[], id: string): MenuItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: item.children ? removeItemById(item.children, id) : undefined,
    }))
}
