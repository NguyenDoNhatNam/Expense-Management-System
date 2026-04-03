import api from './client';

export type CategoryType = 'income' | 'expense';

export interface BackendCategory {
	category_id: string;
	category_name: string;
	category_type: CategoryType;
	icon: string | null;
	color: string | null;
	is_default: boolean;
	parent_category_id: string | null;
	expense_count: number;
	total_amount: string;
}

export interface CategoryListResponse {
	success: boolean;
	message: string;
	data: BackendCategory[];
}

export interface CreateCategoryPayload {
	category_name: string;
	category_type: CategoryType;
	icon?: string;
	color?: string;
	parent_category_id?: string | null;
	is_default?: boolean;
}

export interface CreateOrUpdateCategoryResponse {
	success: boolean;
	message: string;
	data: {
		category_id: string;
		category_name: string;
	};
}

export interface DeleteCategoryPayload {
	action?: 'delete_all' | 'migrate';
	target_category_id?: string;
}

export interface DeleteCategoryResponse {
	success: boolean;
	message: string;
	data?: {
		success: boolean;
		transactions_affected: number;
		action_taken: string;
	};
}

export const listCategoriesApi = async (): Promise<CategoryListResponse> => {
	const response = await api.get<CategoryListResponse>('/categories/list/');
	return response.data;
};

export const createCategoryApi = async (
	payload: CreateCategoryPayload
): Promise<CreateOrUpdateCategoryResponse> => {
	const response = await api.post<CreateOrUpdateCategoryResponse>('/categories/create/', payload);
	return response.data;
};

export const updateCategoryApi = async (
	categoryId: string,
	payload: Partial<CreateCategoryPayload>
): Promise<CreateOrUpdateCategoryResponse> => {
	const response = await api.patch<CreateOrUpdateCategoryResponse>(`/categories/update/${categoryId}/`, payload);
	return response.data;
};

export const deleteCategoryApi = async (
	categoryId: string,
	payload?: DeleteCategoryPayload
): Promise<DeleteCategoryResponse> => {
	const response = await api.delete<DeleteCategoryResponse>(`/categories/delete/${categoryId}/`, {
		data: payload,
	});
	return response.data;
};