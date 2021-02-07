import { GetStaticProps } from "next";
import ReactDOMServer from "react-dom/server";
import pages from "../gen/pages.json";
import _config from "../amdxg.config";
import React from "react";
import { Layout } from "../components/Layout";
import { Article } from "../components/Article";
import {CustomHead} from "../components/CustomHead";

type Props = {
  slug: string;
  toc: Array<any>;
  history: Array<any>;
  frontmatter: {
    title: string;
    created: number;
    tags?: string[];
    description: string;
  };
  tags: string[];
  html: string;
};

export const config = { amp: true };

export const getStaticPaths = async () => {
  const paths = pages.map(page => `/${page.slug}`);
  return {
    paths,
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps = async (props) => {
  const slug = props.params.slug;
  const { frontmatter, default: Doc, toc } = await import(
    `../docs/${slug}.mdx`
  );
  const { default: history } = await import(`../gen/${slug}.history.json`);
  console.log(history);
  return {
    props: {
      slug,
      toc,
      history,
      tags: frontmatter.tags || [],
      frontmatter: frontmatter || { title: slug, created: 0, tags: [], description: "" },
      html: ReactDOMServer.renderToStaticMarkup(<Doc amp />),
    } as Props,
  };
};

export default (props: Props) => (
  <Layout>
    <CustomHead title={`${props.frontmatter.title}`} description={`${props.frontmatter.description}`} path={`/${props.slug}`}/>
    <Article
      slug={props.slug}
      ssgConfig={_config}
      history={props.history}
      toc={props.toc}
      title={props.frontmatter.title}
      createdAt={props.frontmatter.created}
      tags={props.tags}
    >
      <div
        className="markdown"
        dangerouslySetInnerHTML={{ __html: props.html }}
      />
    </Article>
  </Layout>
);
