import * as React from "react";
import {FC} from "react";
import Link from "next/link";
import {Page} from "../types/Page";

type Props = {
  tags: string[]
};

export const TagList = ({tags}: Props) => {
  return (
    <section className="flex my-4 flex-wrap">
      {tags.map(tag => {
        return (
          <Link href={`/tags/${tag}`} key={tag}>
            <a className="bg-blue-200	rounded-full text-blue-900 mr-3 px-3 my-1 cursor-pointer">
              {tag}
            </a>
          </Link>
        )
      })}
    </section>
  );
};
