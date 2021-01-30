// import Head from "next/head";
// import { TagList, PageList } from "amdxg-components";
import pages from "../gen/pages.json";
import _config from "../amdxg.config";
import tagmap from "../gen/tagmap.json";
import { Layout } from "../components/Layout";
import { Header } from "../components/Header";
import React from "react";
import {PageList} from "../components/PageList";
import {TagList} from "../components/TagList";
import {Profile} from "../components/Profile";
import { CustomHead } from "../components/Head";

export const config = { amp: true };

export default () => {
  return (
    <Layout>
      <CustomHead title={"test title"} description={"test description"} keyword={"test keyword"}/>
      <Profile />
      <PageList pages={pages} />
      <TagList tags={Object.keys(tagmap)} />
    </Layout>
  );
};
