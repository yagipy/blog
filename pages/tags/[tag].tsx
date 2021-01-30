import Head from "next/head";
import { TagPage } from "amdxg-components";
import { GetStaticProps } from "next";
import _config from "../../amdxg.config";
import pagemap from "../../gen/pages.json";
import tagmap from "../../gen/tagmap.json";
import { Layout } from "../../components/Layout";
import * as React from "react";
import {PageList} from "../../components/PageList";
import {Page} from "../../types/Page";
import {CustomHead} from "../../components/Head";

export const config = { amp: true };

export const getStaticPaths = () => {
  const paths = Object.keys(tagmap).map((tag) => {
    return `/tags/${tag}`;
  });
  return {
    paths,
    fallback: false,
  };
}

type Props = {
  tagName: string;
  pages: Page[];
};

export const getStaticProps: GetStaticProps = async (props) => {
  const tag = props.params.tag;
  let pages = tagmap[tag as any];
  pages.map(articleDescription => {
    pagemap.map(_page => {
      if (_page.slug === articleDescription.slug) {
        articleDescription.created = _page.created;
      }
    })
  });

  return {
    props: {
      tagName: tag,
      pages: pages,
    } as Props,
  };
};

export default ({tagName, pages}: Props) => {
  return (
    <Layout>
      <CustomHead title={`${tagName} - ${_config.siteName}`} description={`${tagName}タグがついた記事一覧`}/>
      <section className="mb-3">
        <a className="bg-blue-200	rounded-full text-blue-900 px-3 cursor-pointer">
          {tagName}
        </a>
      </section>
      <PageList pages={pages}/>
    </Layout>
  );
};
