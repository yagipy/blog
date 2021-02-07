import * as React from "react";
import {FC} from "react";
import {TagList} from "./TagList";
import {Toc} from "./Toc";
import {HistoryList} from "./HistoryList";
import {toDate} from "../utils/date";

type Props = {
  slug: string
  ssgConfig: any
  history: any
  toc: any
  title: any
  createdAt: number
  tags: any
  children: any
};

export const Article: FC<Props> = ({slug, ssgConfig, history, toc, title, createdAt, tags, children}: Props) => {
  return (
    <>
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="text-gray-700">{`created at ${toDate(createdAt.toString())}`}</p>
      <TagList tags={tags} />
      <Toc toc={toc} slug={slug}/>
      {children}
      <HistoryList history={history}/>
    </>
  );
};
