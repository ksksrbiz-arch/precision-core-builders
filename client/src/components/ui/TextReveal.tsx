/** Headlines stay in normal text flow so glyphs cannot be clipped or rasterized separately. */
interface Props {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}
export function TextReveal({
  text,
  className,
  wordClassName,
  as: Tag = "span",
}: Props) {
  return (
    <Tag className={className}>
      <span className={wordClassName}>{text}</span>
    </Tag>
  );
}
