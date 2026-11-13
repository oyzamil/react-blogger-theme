import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";

import { cn } from "@/utils/cn";

/** Wait this long before showing the bar, so instant navigations do not flash it. */
const SHOW_AFTER_MS = 120;
/** How long the finished bar stays before it fades. */
const FINISH_MS = 250;

/**
 * Thin loading bar at the top of the page while a navigation is loading
 * (react-router `useNavigation`). It creeps towards ~90 % while waiting and
 * jumps to 100 % when the page is ready, like NProgress.
 *
 * Mount once, inside the router.
 */
export default function NavigationProgress({
	className,
}: {
	className?: string;
}) {
	const navigation = useNavigation();
	const active = navigation.state !== "idle";

	const [visible, setVisible] = useState(false);
	const [progress, setProgress] = useState(0);
	const shown = useRef(false);

	useEffect(() => {
		if (active) {
			const show = window.setTimeout(() => {
				shown.current = true;
				setVisible(true);
				setProgress(10);
			}, SHOW_AFTER_MS);

			const creep = window.setInterval(() => {
				// ease out: big steps first, ever smaller, never reaches 100
				setProgress((value) => (shown.current ? value + (92 - value) * 0.1 : value));
			}, 200);

			return () => {
				window.clearTimeout(show);
				window.clearInterval(creep);
			};
		}

		// done
		if (!shown.current) return;
		setProgress(100);
		const hide = window.setTimeout(() => {
			shown.current = false;
			setVisible(false);
			setProgress(0);
		}, FINISH_MS);

		return () => window.clearTimeout(hide);
	}, [active]);

	return (
		<div
			role="progressbar"
			aria-label="Loading page"
			aria-hidden={!visible}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={visible ? Math.round(progress) : undefined}
			className={cn(
				"pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5",
				className,
			)}
		>
			<div
				className={cn(
					"h-full origin-left bg-primary shadow-[0_0_8px_var(--color-primary)] transition-[width,opacity] ease-out motion-reduce:transition-none",
					progress >= 100 ? "duration-200" : "duration-300",
				)}
				style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
			/>
		</div>
	);
}
