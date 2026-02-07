import { PropsWithChildren } from "react";
import { MdOpenInNew as LinkIcon } from "react-icons/md";

export interface ExternalLinkProps {
  href: string;
  className?: string;
}

export const ExternalLink = ({
  href,
  children,
  className,
}: PropsWithChildren<ExternalLinkProps>) => {
  return (
    <a className={className ?? "text-primary hover:underline"} target="_blank" rel="noreferrer" href={href}>
      {children}
      <LinkIcon className="inline-block w-4 mx-1 align-text-top" />
    </a>
  );
};
