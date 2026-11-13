import {
  ChevronDownIcon,
  ChevronRightIcon,
  LinkIcon,
  ReplyIcon,
} from "lucide-react";
import { useState } from "react";

import {
  type CommentNode,
  formatRelativeTime,
  getAvatarSrc,
  getInitials,
} from "@/lib/blogger";

import { cn } from "@/utils/cn";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { useCommentsContext } from "@/contexts/comments";
import CommentFrame from "./CommentFrame";

/** One comment and, below it, its replies. Recursive: any depth. */
export default function CommentItem({ node }: { node: CommentNode }) {
  const ctx = useCommentsContext();
  const [collapsed, setCollapsed] = useState(false);

  const { author } = node;
  const replying = ctx.replyingTo === node.id;
  const hasReplies = node.replies.length > 0;
  // children of this comment move right until `maxDepth`, then stay put
  const indentChildren = node.depth < ctx.maxDepth;
  const avatar = getAvatarSrc(author.image);

  return (
    <li
      id={`c${node.id}`}
      data-depth={node.depth}
      data-highlight={ctx.highlightId === node.id || undefined}
      className="scroll-mt-20 rounded-lg data-[highlight]:bg-primary/5 data-[highlight]:ring-2 data-[highlight]:ring-primary/30"
    >
      <div className="flex gap-3">
        <Avatar size={node.depth > 0 ? "sm" : "default"} className="mt-0.5">
          {avatar && (
            <AvatarImage src={avatar} alt="" referrerPolicy="no-referrer" />
          )}
          <AvatarFallback>{getInitials(author.name)}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            {author.url && !author.isAnonymous ? (
              <a
                href={author.url}
                rel="nofollow ugc noopener"
                target="_blank"
                className="font-semibold hover:underline"
              >
                {author.name}
              </a>
            ) : (
              <span className="font-semibold">{author.name}</span>
            )}

            {author.isPostAuthor && <Badge variant="secondary">Author</Badge>}

            <a
              href={`#c${node.id}`}
              aria-label="Link to this comment"
              className="group/permalink inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
            >
              <time
                dateTime={new Date(node.timestampMs).toISOString()}
                title={node.timestamp}
              >
                {formatRelativeTime(node.timestampMs)}
              </time>
              <LinkIcon className="size-3 opacity-0 group-hover/permalink:opacity-100 group-focus-visible/permalink:opacity-100" />
            </a>
          </header>

          {node.isDeleted ? (
            <p className="text-muted-foreground text-sm italic">
              This comment has been removed.
            </p>
          ) : (
            <div
              className="comment-body break-words text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3"
              // Blogger sanitises comment HTML on the server
              // biome-ignore lint/security/noDangerouslySetInnerHtml: see above
              dangerouslySetInnerHTML={{ __html: node.body }}
            />
          )}

          <footer className="flex flex-wrap items-center gap-x-3 text-muted-foreground text-xs">
            {ctx.canReply &&
              (ctx.formUrl ? (
                <button
                  type="button"
                  aria-expanded={replying}
                  onClick={() => ctx.setReplyingTo(replying ? null : node.id)}
                  className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
                >
                  <ReplyIcon className="size-3.5" />
                  {replying ? "Cancel reply" : "Reply"}
                </button>
              ) : (
                ctx.fallbackUrl && (
                  <a
                    href={ctx.fallbackUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <ReplyIcon className="size-3.5" />
                    Reply
                  </a>
                )
              ))}

            {hasReplies && (
              <button
                type="button"
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((value) => !value)}
                className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
              >
                {collapsed ? (
                  <ChevronRightIcon className="size-3.5" />
                ) : (
                  <ChevronDownIcon className="size-3.5" />
                )}
                {collapsed
                  ? `Show ${node.descendants} ${node.descendants === 1 ? "reply" : "replies"}`
                  : "Hide replies"}
              </button>
            )}
          </footer>

          {replying && ctx.formUrl && (
            <div className="mt-1 flex flex-col gap-2">
              <p className="text-muted-foreground text-xs">
                Replying to <strong>{author.name}</strong>
              </p>
              <CommentFrame
                url={ctx.formUrl}
                parentId={node.id}
                height={ctx.frameHeight}
                title={`Reply to ${author.name}`}
                onSubmitted={ctx.onSubmitted}
              />
            </div>
          )}
        </div>
      </div>

      {hasReplies && !collapsed && (
        <ol
          className={cn(
            "mt-4 flex flex-col gap-4",
            indentChildren && "ml-4 border-l pl-4 sm:ml-6 sm:pl-5",
          )}
        >
          {node.replies.map((reply) => (
            <CommentItem key={reply.id} node={reply} />
          ))}
        </ol>
      )}
    </li>
  );
}
