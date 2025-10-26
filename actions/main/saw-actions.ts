'use server';

import { prismaMain } from '@/lib/prisma/main';
import { revalidatePath } from 'next/cache';

// Get all SAW types
export async function getSAWTypes() {
  try {
    const types = await prismaMain.sAW_Type.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { success: true, data: types };
  } catch (error) {
    console.error('Error fetching SAW types:', error);
    return { success: false, error: 'Failed to fetch SAW types' };
  }
}

// Create a new SAW type
export async function createSAWType(data: {
  name: string;
  description?: string;
}) {
  try {
    const type = await prismaMain.sAW_Type.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
    revalidatePath('/');
    return { success: true, data: type };
  } catch (error) {
    console.error('Error creating SAW type:', error);
    return { success: false, error: 'Failed to create SAW type' };
  }
}

// Get all SAW items with their types
export async function getSAWItems() {
  try {
    const items = await prismaMain.sAW_Item.findMany({
      where: {
        isActive: true,
      },
      include: {
        type: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error('Error fetching SAW items:', error);
    return { success: false, error: 'Failed to fetch SAW items' };
  }
}

// Create a new SAW item
export async function createSAWItem(data: {
  name?: string;
  description?: string;
  type_id?: number;
  DesignParameter?: any;
}) {
  try {
    const item = await prismaMain.sAW_Item.create({
      data: {
        name: data.name,
        description: data.description,
        type_id: data.type_id,
        DesignParameter: data.DesignParameter,
      },
    });
    revalidatePath('/');
    return { success: true, data: item };
  } catch (error) {
    console.error('Error creating SAW item:', error);
    return { success: false, error: 'Failed to create SAW item' };
  }
}

// Delete a SAW item (soft delete)
export async function deleteSAWItem(id: number) {
  try {
    const item = await prismaMain.sAW_Item.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
    revalidatePath('/');
    return { success: true, data: item };
  } catch (error) {
    console.error('Error deleting SAW item:', error);
    return { success: false, error: 'Failed to delete SAW item' };
  }
}