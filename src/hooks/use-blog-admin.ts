import { useStore } from "zustand/react";

import { preferencesStore } from "@/stores/preferences";

/**
 * Is the visitor an admin of this blog? Detected once in production
 * (Blogger's authorization.css, see PreferencesBlogAdminAction).
 * Detection is off in dev, so everything is treated as admin there: you can see
 * and try admin-only controls on localhost.
 */
export function useBlogAdmin(): boolean {
	const blogAdmin = useStore(preferencesStore, (state) => state.blogAdmin);
	return blogAdmin || import.meta.env.DEV;
}
