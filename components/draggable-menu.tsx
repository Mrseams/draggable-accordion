"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { ChevronDown, GripVertical, X } from "lucide-react"
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

type DropZone = {
  id: string
  position: "before" | "after" | "inside"
  level: number
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
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropZone, setDropZone] = useState<DropZone | null>(null)

  const removeItemFromTree = useCallback((tree: MenuItem[], id: string): [MenuItem | null, MenuItem[]] => {
    let removed: MenuItem | null = null

    const newTree = tree.reduce<MenuItem[]>((acc, item) => {
      if (item.id === id) {
        removed = { ...item, children: item.children ? [...item.children] : undefined }
        return acc
      }

      if (item.children && item.children.length > 0) {
        const [childRemoved, newChildren] = removeItemFromTree(item.children, id)
        if (childRemoved) removed = childRemoved
        acc.push({
          ...item,
          children: newChildren.length > 0 ? newChildren : undefined,
        })
      } else {
        acc.push({ ...item })
      }

      return acc
    }, [])

    return [removed, newTree]
  }, [])

  const insertItemInTree = useCallback(
    (tree: MenuItem[], item: MenuItem, targetId: string, position: "before" | "after" | "inside"): MenuItem[] => {
      // Handle "inside" - add as child of target
      if (position === "inside") {
        return tree.map((node) => {
          if (node.id === targetId) {
            return {
              ...node,
              children: [...(node.children || []), item],
            }
          }
          if (node.children) {
            return {
              ...node,
              children: insertItemInTree(node.children, item, targetId, position),
            }
          }
          return node
        })
      }

      // Handle "before" and "after" at current level
      const result: MenuItem[] = []
      let inserted = false

      for (const node of tree) {
        if (node.id === targetId) {
          if (position === "before") {
            result.push(item)
            result.push({ ...node, children: node.children ? [...node.children] : undefined })
          } else {
            result.push({ ...node, children: node.children ? [...node.children] : undefined })
            result.push(item)
          }
          inserted = true
        } else if (node.children && node.children.length > 0) {
          const newChildren = insertItemInTree(node.children, item, targetId, position)
          // Check if item was inserted in children
          const wasInsertedInChildren =
            newChildren.length !== node.children.length || JSON.stringify(newChildren) !== JSON.stringify(node.children)

          if (wasInsertedInChildren) {
            inserted = true
          }
          result.push({ ...node, children: newChildren })
        } else {
          result.push({ ...node })
        }
      }

      return result
    },
    [],
  )

  const isDescendant = useCallback((tree: MenuItem[], parentId: string, targetId: string): boolean => {
    const findInChildren = (items: MenuItem[]): boolean => {
      for (const item of items) {
        if (item.id === parentId) {
          // Found the parent, now check if target is in its subtree
          const checkSubtree = (nodes: MenuItem[]): boolean => {
            for (const node of nodes) {
              if (node.id === targetId) return true
              if (node.children && checkSubtree(node.children)) return true
            }
            return false
          }
          return item.children ? checkSubtree(item.children) : false
        }
        if (item.children && findInChildren(item.children)) return true
      }
      return false
    }
    return findInChildren(tree)
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", id)

    // Add drag image with slight delay for better visual
    const target = e.currentTarget as HTMLElement
    target.style.opacity = "0.5"
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = "1"
    setDraggedId(null)
    setDropZone(null)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string, level: number, hasChildren: boolean) => {
      e.preventDefault()
      e.stopPropagation()

      if (draggedId === id) return

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const y = e.clientY - rect.top
      const height = rect.height
      const x = e.clientX - rect.left

      // Determine position based on vertical mouse position
      let position: "before" | "after" | "inside"

      if (y < height * 0.25) {
        position = "before"
      } else if (y > height * 0.75) {
        position = "after"
      } else {
        // Middle zone - if dragging to the right side and target can have children, nest inside
        if (x > rect.width * 0.3) {
          position = "inside"
        } else {
          position = y < height * 0.5 ? "before" : "after"
        }
      }

      setDropZone({ id, position, level })
    },
    [draggedId],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the component entirely
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      // Don't clear immediately to prevent flickering
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!draggedId || !dropZone || draggedId === dropZone.id) {
        setDraggedId(null)
        setDropZone(null)
        return
      }

      // Prevent dropping parent into its own children
      if (isDescendant(items, draggedId, dropZone.id)) {
        setDraggedId(null)
        setDropZone(null)
        return
      }

      // Remove dragged item from tree
      const [removedItem, treeWithoutDragged] = removeItemFromTree(items, draggedId)

      if (!removedItem) {
        setDraggedId(null)
        setDropZone(null)
        return
      }

      // Insert at new position
      const newTree = insertItemInTree(treeWithoutDragged, removedItem, dropZone.id, dropZone.position)

      if (onItemsChange) {
        onItemsChange(newTree)
      }

      setDraggedId(null)
      setDropZone(null)
    },
    [draggedId, dropZone, items, isDescendant, removeItemFromTree, insertItemInTree, onItemsChange],
  )

  const handleRemove = useCallback(
    (id: string) => {
      if (onRemoveItem) {
        onRemoveItem(id)
      }
    },
    [onRemoveItem],
  )

  const handleToggleExpand = useCallback(
    (id: string) => {
      if (onToggleExpand) {
        onToggleExpand(id)
      }
    },
    [onToggleExpand],
  )

  return (
    <div className={cn("w-full", className)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      {items.map((item, index) => (
        <MenuItemComponent
          key={item.id}
          item={item}
          index={index}
          level={0}
          draggedId={draggedId}
          dropZone={dropZone}
          expandedItems={expandedItems}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onRemove={handleRemove}
          onToggleExpand={handleToggleExpand}
          itemClassName={itemClassName}
          childrenClassName={childrenClassName}
          showDragHandle={showDragHandle}
          showRemoveButton={showRemoveButton}
        />
      ))}
    </div>
  )
}

interface MenuItemComponentProps {
  item: MenuItem
  index: number
  level: number
  draggedId: string | null
  dropZone: DropZone | null
  expandedItems: Set<string>
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent, id: string, level: number, hasChildren: boolean) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onRemove: (id: string) => void
  onToggleExpand: (id: string) => void
  itemClassName?: string
  childrenClassName?: string
  showDragHandle: boolean
  showRemoveButton: boolean
}

const MenuItemComponent = ({
  item,
  index,
  level,
  draggedId,
  dropZone,
  expandedItems,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
  onToggleExpand,
  itemClassName,
  childrenClassName,
  showDragHandle,
  showRemoveButton,
}: MenuItemComponentProps) => {
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems.has(item.id)
  const isDragging = draggedId === item.id
  const isDropTarget = dropZone?.id === item.id

  const showDropBefore = isDropTarget && dropZone?.position === "before"
  const showDropAfter = isDropTarget && dropZone?.position === "after"
  const showDropInside = isDropTarget && dropZone?.position === "inside"

  return (
    <div className="relative">
      <div
        className={cn(
          "absolute left-0 right-0 h-0.5 bg-primary rounded-full transition-all duration-150 ease-out z-10",
          showDropBefore ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0",
        )}
        style={{
          top: -1,
          marginLeft: level * 24 + 16,
          marginRight: 16,
        }}
      />

      {/* Main menu item */}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, item.id)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, item.id, level, hasChildren || false)}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex items-center gap-2 px-4 py-3 border border-border bg-background cursor-grab active:cursor-grabbing",
          "transition-all duration-200 ease-out",
          isDragging && "opacity-40 scale-[0.98] shadow-lg ring-2 ring-primary/20",
          showDropInside && "ring-2 ring-primary bg-primary/5 scale-[1.01]",
          !isDragging && !isDropTarget && "hover:bg-accent/50 hover:border-accent-foreground/20",
          itemClassName,
        )}
        style={{
          marginLeft: level * 24,
          borderRadius: "0.375rem",
        }}
      >
        {/* Drag handle */}
        {showDragHandle && (
          <GripVertical
            className={cn(
              "h-5 w-5 flex-shrink-0 text-muted-foreground transition-colors duration-150",
              "hover:text-foreground",
            )}
          />
        )}

        {/* Expand/Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(item.id)
            }}
            className={cn(
              "flex-shrink-0 p-1.5 h-8 w-8 flex items-center justify-center rounded",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              "transition-all duration-200 ease-out",
            )}
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
            "flex-1 font-medium text-foreground select-none",
            "transition-colors duration-150",
            hasChildren && "cursor-pointer hover:text-primary",
          )}
        >
          {item.label}
        </span>

        {/* Remove button */}
        {showRemoveButton && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(item.id)
            }}
            className={cn(
              "flex-shrink-0 p-1.5 rounded",
              "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              "transition-all duration-150 ease-out",
              "opacity-60 hover:opacity-100",
            )}
            aria-label="Remove item"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        className={cn(
          "absolute left-0 right-0 h-0.5 bg-primary rounded-full transition-all duration-150 ease-out z-10",
          showDropAfter ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0",
        )}
        style={{
          bottom: -1,
          marginLeft: level * 24 + 16,
          marginRight: 16,
        }}
      />

      {/* Children items with smooth animation */}
      {hasChildren && (
        <div
          className={cn("overflow-hidden transition-all duration-300 ease-out", childrenClassName)}
          style={{
            maxHeight: isExpanded ? `${item.children!.length * 100}px` : "0px",
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? "translateY(0)" : "translateY(-8px)",
          }}
        >
          {item.children!.map((child, childIndex) => (
            <MenuItemComponent
              key={child.id}
              item={child}
              index={childIndex}
              level={level + 1}
              draggedId={draggedId}
              dropZone={dropZone}
              expandedItems={expandedItems}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onRemove={onRemove}
              onToggleExpand={onToggleExpand}
              itemClassName={itemClassName}
              childrenClassName={childrenClassName}
              showDragHandle={showDragHandle}
              showRemoveButton={showRemoveButton}
            />
          ))}
        </div>
      )}
    </div>
  )
}
