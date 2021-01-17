import * as React from "react";
import {FC} from "react";
import {TagList} from "./TagList";
import {Toc} from "./Toc";
import {HistoryList} from "./HistoryList";

type Props = {
  slug: string
  ssgConfig: any
  history: any
  toc: any
  title: any
  tags: any
  children: any
};

export const Article: FC<Props> = ({slug, ssgConfig, history, toc, title, tags, children}: Props) => {
  return (
    <>
      <h1 className="text-4xl font-bold">{title}</h1>
      <TagList tags={tags} />
      <Toc toc={toc} slug={slug}/>
      {children}
      <HistoryList history={history}/>
    </>
  );
};
