import { apiClient } from "./client";

export interface Artwork {
  id: string;
  branchId: string;
  title: string;
  description: string | null;
  tags: string[];
  images: string[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtworkWithBranch extends Artwork {
  branchName: string;
  branchLocation: string | null;
  branchAvatar: string | null;
}

export interface ArtworkEligibility {
  eligible: boolean;
  required: number;
  current: number;
}

export const artworkApi = {
  async checkEligibility(branchId: string): Promise<ArtworkEligibility> {
    const response = await apiClient.get(`/artworks/eligibility/${branchId}`);
    return response.data.data;
  },

  async getByBranch(branchId: string): Promise<Artwork[]> {
    const response = await apiClient.get(`/artworks/branch/${branchId}`);
    return response.data.data || [];
  },

  async getById(id: string): Promise<ArtworkWithBranch> {
    const response = await apiClient.get(`/artworks/${id}`);
    return response.data.data || response.data;
  },

  async create(data: {
    branchId: string;
    title: string;
    description?: string;
    tags?: string[];
    images?: File[];
  }): Promise<Artwork> {
    const formData = new FormData();
    formData.append("branchId", data.branchId);
    formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    if (data.tags && data.tags.length > 0) {
      formData.append("tags", JSON.stringify(data.tags));
    }
    if (data.images) {
      data.images.forEach((file) => formData.append("images", file));
    }
    const response = await apiClient.post("/artworks", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data || response.data;
  },

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      tags?: string[];
      isActive?: boolean;
      existingImages?: string[];
      images?: File[];
    }
  ): Promise<Artwork> {
    const formData = new FormData();
    if (data.title) formData.append("title", data.title);
    if (data.description !== undefined)
      formData.append("description", data.description || "");
    if (data.tags) formData.append("tags", JSON.stringify(data.tags));
    if (data.isActive !== undefined)
      formData.append("isActive", String(data.isActive));
    if (data.existingImages)
      formData.append("existingImages", JSON.stringify(data.existingImages));
    if (data.images) {
      data.images.forEach((file) => formData.append("images", file));
    }
    const response = await apiClient.put(`/artworks/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data || response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/artworks/${id}`);
  },
};
