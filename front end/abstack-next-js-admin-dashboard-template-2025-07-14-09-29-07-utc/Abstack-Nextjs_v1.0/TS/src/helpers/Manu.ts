import { HORIZONTAL_MENU_ITEM, MENU_ITEMS } from '../assets/data/menu-items'
import { MenuItemType } from '../types/menu'
import type { Role } from '@/lib/auth/roles'

function filterMenuItems(items: MenuItemType[], role: Role): MenuItemType[] {
  return items
    .filter((item) => {
      if (!item.allowedRoles || item.allowedRoles.length === 0) return true
      return item.allowedRoles.includes(role)
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuItems(item.children, role) : undefined,
    }))
}

export const getMenuItems = (role?: Role): MenuItemType[] => {
  if (!role) return MENU_ITEMS
  return filterMenuItems(MENU_ITEMS, role)
}

export const getHorizontalMenuItems = (role?: Role): MenuItemType[] => {
  if (!role) return HORIZONTAL_MENU_ITEM
  return filterMenuItems(HORIZONTAL_MENU_ITEM, role)
}

export const findAllParent = (menuItems: MenuItemType[], menuItem: MenuItemType): string[] => {
  let parents: string[] = []
  const parent = findMenuItem(menuItems, menuItem.parentKey)
  if (parent) {
    parents.push(parent.key)
    if (parent.parentKey) {
      parents = [...parents, ...findAllParent(menuItems, parent)]
    }
  }
  return parents
}

export const getMenuItemFromURL = (items: MenuItemType | MenuItemType[], url: string): MenuItemType | undefined => {
  if (items instanceof Array) {
    for (const item of items) {
      const foundItem = getMenuItemFromURL(item, url)
      if (foundItem) {
        return foundItem
      }
    }
  } else {
    if (items.url == url) return items
    if (items.children != null) {
      for (const item of items.children) {
        if (item.url == url) return item
      }
    }
  }
}

export const findMenuItem = (menuItems: MenuItemType[] | undefined, menuItemKey: MenuItemType['key'] | undefined): MenuItemType | null => {
  if (menuItems && menuItemKey) {
    for (const item of menuItems) {
      if (item.key === menuItemKey) {
        return item
      }
      const found = findMenuItem(item.children, menuItemKey)
      if (found) return found
    }
  }
  return null
}
