import type { VariantProps } from "class-variance-authority";
import { MoreHorizontalIcon } from "lucide-react";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/utils/cn";

import { buttonVariants } from "./button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			aria-label="pagination"
			data-slot="pagination"
			className={cn("mx-auto flex w-full justify-center", className)}
			{...props}
		/>
	);
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="pagination-content"
			className={cn("flex flex-row flex-wrap items-center gap-1", className)}
			{...props}
		/>
	);
}

function PaginationItem(props: React.ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = React.ComponentProps<"a"> &
	Pick<VariantProps<typeof buttonVariants>, "size"> & {
		isActive?: boolean;
		/** Render the child (e.g. react-router `Link`) instead of an `<a>`. */
		asChild?: boolean;
		/** No target yet / no such page: not clickable. */
		disabled?: boolean;
	};

function PaginationLink({
	className,
	isActive,
	disabled,
	size = "icon",
	asChild = false,
	...props
}: PaginationLinkProps) {
	const Comp = asChild ? Slot.Root : "a";

	return (
		<Comp
			aria-current={isActive ? "page" : undefined}
			aria-disabled={disabled || undefined}
			data-slot="pagination-link"
			data-active={isActive}
			className={cn(
				buttonVariants({ variant: isActive ? "default" : "ghost", size }),
				disabled && "pointer-events-none opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn("flex size-8 items-center justify-center", className)}
			{...props}
		>
			<MoreHorizontalIcon className="size-4" />
			<span className="sr-only">More pages</span>
		</span>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
};
