"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Define a type for public metadata to ensure type safety
interface UserPublicMetadata {
  role?: 'superuser' | 'user';
}

export async function createUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  try {
    const client = await clerkClient();
    await client.users.createUser({
      emailAddress: [email],
      password: password,
      publicMetadata: { role: role },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(error.errors?.[0]?.longMessage || 'Failed to create user');
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateUserRole(formData: FormData) {
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as 'superuser' | 'user';

  try {
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { role: role },
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    throw new Error(error.errors?.[0]?.longMessage || 'Failed to update user role');
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteUser(formData: FormData) {
  const userId = formData.get("userId") as string;

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw new Error(error.errors?.[0]?.longMessage || 'Failed to delete user');
  }

  revalidatePath("/admin");
  redirect("/admin");
}