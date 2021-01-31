import * as React from "react";
import {FC} from "react";
import Link from "next/link";
import {Page} from "../types/Page";
import {TagList} from "./TagList";
import {toDate} from "../utils/date";

type Props = {
  pages: Page[]
};

export const PageList = ({pages}: Props) => {
  return (
    <>
      <ul>
        {pages.map(page => (
          <li key={page.slug}>
            <Link href={`/${page.slug}`}>
              <a className="text-blue-600 font-bold cursor-pointer hover:underline">
                {page.title}
                <span className="text-gray-700 font-normal">
                  {` created at ${toDate(`${page.created}`)}`}
                </span>
              </a>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};
