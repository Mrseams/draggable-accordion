"use client"

import type React from "react"

import { useState } from "react"
import { ChevronDown, GripVertical, X, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MenuItem {
  id: string
  label: string
  children?: MenuItem[]
}

export interface DraggableMenuProps {
  items: MenuItem[]
  onItemsChange?: (items: MenuItem[]) => void
  onRemoveItem?: (id: string) => void
  onToggleExpand?: (id: string) => void
  expandedItems?: Set<string>
  className?: string
  itemClassName?: string
  childrenClassName?: string
  showDragHandle?: boolean
  showRemoveButton?: boolean
}

export const DraggableMenu = ({
  items,
  onItemsChange,
  onRemoveItem,
  onToggleExpand,
  expandedItems = new Set(),
  className,
  itemClassName,
  childrenClassName,
  showDragHandle = true,
  showRemoveButton = true,
}: DraggableMenuProps) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<"above" | "below" | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id)
    e.dataTransfer!.effectAllowed = "move"
    e.dataTransfer!.setData("text/plain", id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer!.dropEffect = "move"

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midpoint = rect.height / 2
    const position = e.clientY - rect.top < midpoint ? "above" : "below"

    setDragOverItem(id)
    setDragPosition(position)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
    setDragPosition(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedItem && draggedItem !== targetId) {
      const flatList = flattenWithParent(items)
      const draggedIdx = flatList.findIndex((x) => x.id === draggedItem)
      const targetIdx = flatList.findIndex((x) => x.id === targetId)

      if (draggedIdx !== -1 && targetIdx !== -1) {
        const newFlatList = [...flatList]
        const [draggedEntry] = newFlatList.splice(draggedIdx, 1)

        const insertIdx = dragPosition === "above" ? targetIdx : targetIdx + (draggedIdx < targetIdx ? 0 : 1)
        newFlatList.splice(insertIdx > draggedIdx ? insertIdx - 1 : insertIdx, 0, draggedEntry)

        const rebuilt = rebuildTreeFromFlat(newFlatList)
        if (onItemsChange) {
          onItemsChange(rebuilt)
        }
      }
    }

    setDraggedItem(null)
    setDragOverItem(null)
    setDragPosition(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
    setDragPosition(null)
  }

  const handleRemove = (id: string) => {
    if (onRemoveItem) {
      onRemoveItem(id)
    }
  }

  const handleToggleExpand = (id: string) => {
    if (onToggleExpand) {
      onToggleExpand(id)
    }
  }

  const handlePromote = (id: string) => {
    const flatList = flattenWithParent(items)
    const item = flatList.find((x) => x.id === id)

    if (item && item.parentId) {
      // Move item up one level
      item.parentId = flatList.find((x) => x.id === item.parentId)?.parentId || null
      const rebuilt = rebuildTreeFromFlat(flatList)
      if (onItemsChange) {
        onItemsChange(rebuilt)
      }
    }
  }

  const handleDemote = (id: string) => {
    const flatList = flattenWithParent(items)
    const itemIdx = flatList.findIndex((x) => x.id === id)

    if (itemIdx > 0) {
      const prevItem = flatList[itemIdx - 1]
      // Make current item a child of the previous item
      const item = flatList[itemIdx]
      item.parentId = prevItem.id

      // Ensure previous item has children array
      if (!prevItem.children) {
        prevItem.children = []
      }

      const rebuilt = rebuildTreeFromFlat(flatList)
      if (onItemsChange) {
        onItemsChange(rebuilt)
      }
    }
  }

  return (
    <div className={cn("w-full space-y-0", className)}>
      {items.map((item) => (
        <MenuItemComponent
          key={item.id}
          item={item}
          level={0}
          draggedItem={draggedItem}
          dragOverItem={dragOverItem}
          dragPosition={dragPosition}
          expandedItems={expandedItems}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onRemove={handleRemove}
          onToggleExpand={handleToggleExpand}
          onPromote={handlePromote}
          onDemote={handleDemote}
          itemClassName={itemClassName}
          childrenClassName={childrenClassName}
          showDragHandle={showDragHandle}
          showRemoveButton={showRemoveButton}
          canPromote={false}
        />
      ))}
    </div>
  )
}

interface MenuItemComponentProps {
  item: MenuItem
  level: number
  draggedItem: string | null
  dragOverItem: string | null
  dragPosition: "above" | "below" | null
  expandedItems: Set<string>
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onRemove: (id: string) => void
  onToggleExpand: (id: string) => void
  onPromote: (id: string) => void
  onDemote: (id: string) => void
  itemClassName?: string
  childrenClassName?: string
  showDragHandle: boolean
  showRemoveButton: boolean
  canPromote: boolean
}

const MenuItemComponent = ({
  item,
  level,
  draggedItem,
  dragOverItem,
  dragPosition,
  expandedItems,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onRemove,
  onToggleExpand,
  onPromote,
  onDemote,
  itemClassName,
  childrenClassName,
  showDragHandle,
  showRemoveButton,
  canPromote,
}: MenuItemComponentProps) => {
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems.has(item.id)
  const isDragging = draggedItem === item.id
  const isDropTarget = dragOverItem === item.id

  return (
    <>
      {/* Drop indicator above */}
      {isDropTarget && dragPosition === "above" && <div className="h-0.5 bg-primary mx-4 rounded-full" />}

      {/* Main menu item */}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, item.id)}
        onDragOver={(e) => onDragOver(e, item.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, item.id)}
        onDragEnd={onDragEnd}
        className={cn(
          "flex items-center gap-2 px-4 py-3 border border-border rounded-md cursor-move transition-all duration-150 ease-out",
          isDragging && "opacity-30 scale-95 shadow-md",
          isDropTarget && dragPosition === "below" && "border-primary/70 bg-primary/5",
          !isDragging && !isDropTarget && "hover:bg-accent/30",
          itemClassName,
        )}
        style={{
          marginLeft: level > 0 ? `${level * 24}px` : 0,
        }}
      >
        {/* Drag handle */}
        {showDragHandle && (
          <GripVertical
            className={cn(
              "h-4 w-4 flex-shrink-0 transition-colors duration-150",
              isDragging ? "text-muted-foreground/40" : "text-muted-foreground",
            )}
          />
        )}

        {/* Expand/Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(item.id)}
            className="flex-shrink-0 p-2 h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all duration-200"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-300 ease-out", isExpanded && "rotate-180")}
            />
          </button>
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}

        {/* Label */}
        <span
          onClick={() => hasChildren && onToggleExpand(item.id)}
          className={cn(
            "flex-1 font-medium text-foreground transition-colors duration-150",
            hasChildren && "cursor-pointer hover:text-primary",
          )}
        >
          {item.label}
        </span>

        {level > 0 && (
          <button
            onClick={() => onPromote(item.id)}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-all duration-150 rounded hover:bg-muted hover:scale-110"
            title="Promote to parent level"
            aria-label="Promote item"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {level === 0 && (
          <button
            onClick={() => onDemote(item.id)}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-all duration-150 rounded hover:bg-muted hover:scale-110"
            title="Demote to child of previous item"
            aria-label="Demote item"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Remove button */}
        {showRemoveButton && (
          <button
            onClick={() => onRemove(item.id)}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-all duration-150 rounded hover:bg-muted hover:scale-110"
            aria-label="Remove item"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Drop indicator below */}
      {isDropTarget && dragPosition === "below" && <div className="h-0.5 bg-primary mx-4 rounded-full" />}

      {/* Children items */}
      {hasChildren && isExpanded && (
        <div
          className={cn(
            "space-y-0 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200",
            childrenClassName,
          )}
        >
          {item.children!.map((child) => (
            <MenuItemComponent
              key={child.id}
              item={child}
              level={level + 1}
              draggedItem={draggedItem}
              dragOverItem={dragOverItem}
              dragPosition={dragPosition}
              expandedItems={expandedItems}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onRemove={onRemove}
              onToggleExpand={onToggleExpand}
              onPromote={onPromote}
              onDemote={onDemote}
              itemClassName={itemClassName}
              childrenClassName={childrenClassName}
              showDragHandle={showDragHandle}
              showRemoveButton={showRemoveButton}
              canPromote={true}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface FlatItem extends MenuItem {
  parentId: string | null
}

function flattenWithParent(items: MenuItem[], parentId: string | null = null): FlatItem[] {
  const result: FlatItem[] = []
  items.forEach((item) => {
    result.push({ ...item, parentId })
    if (item.children) {
      result.push(...flattenWithParent(item.children, item.id))
    }
  })
  return result
}

function rebuildTreeFromFlat(flatList: FlatItem[]): MenuItem[] {
  const itemMap = new Map<string, MenuItem>()

  // Create all items first
  flatList.forEach((item) => {
    itemMap.set(item.id, {
      id: item.id,
      label: item.label,
      children: [],
    })
  })

  // Rebuild relationships
  flatList.forEach((item) => {
    if (item.parentId) {
      const parent = itemMap.get(item.parentId)
      const current = itemMap.get(item.id)
      if (parent && current) {
        parent.children!.push(current)
      }
    }
  })

  // Return only root items (those with no parent)
  return flatList.filter((item) => item.parentId === null).map((item) => itemMap.get(item.id)!)
}
