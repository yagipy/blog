import * as React from "react";
import Link from "next/link";

type ToC = {
  depth: number
  id: string
  title: string
}

type Props = {
  toc?: ToC[]
  slug: string
};

const generateHash = (toc: ToC) => {
  let hash = "";
  [...Array(toc.depth)].map(() => hash += "#");
  return hash;
}

export const Toc = ({toc, slug}: Props) => {
  return (
    <details className="my-3">
      <summary className="outline-none cursor-pointer hover:underline">ToC</summary>
      {toc.map(el => {
        return (
          <>
            <Link href={`/${slug}#${el.id}`}>
              <a className="text-blue-500 hover:underline">{`${generateHash(el)} ${el.title}`}</a>
            </Link>
            <br/>
          </>
          )
      })}
    </details>
  );
};
