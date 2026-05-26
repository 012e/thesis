/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  AutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from "@lexical/react/LexicalAutoLinkPlugin";
import React, { FC } from "react";

const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const HASHTAG_REGEX = /#([A-Za-z_]\w{0,49}|[\d_]*[A-Za-z]\w{0,49})/;

const MATCHERS = [
  (text: string) => {
    const match = HASHTAG_REGEX.exec(text);
    const tag = match?.[1];
    if (!match || !tag || !/[A-Za-z]/.test(tag)) {
      return null;
    }

    return {
      index: match.index,
      length: match[0].length,
      text: match[0],
      url: `/tags/${tag.toLowerCase()}`,
    };
  },
  createLinkMatcherWithRegExp(URL_REGEX, (text) => {
    return text.startsWith("http") ? text : `https://${text}`;
  }),
  createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => {
    return `mailto:${text}`;
  }),
];

export const LexicalAutoLinkPlugin: FC = () => {
  return <AutoLinkPlugin matchers={MATCHERS} />;
};
