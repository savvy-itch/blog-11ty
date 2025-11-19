import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";

export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("./public/styles/");
  eleventyConfig.addPassthroughCopy("./public/fonts/");
  eleventyConfig.addPassthroughCopy("./public/images/");
  eleventyConfig.addPassthroughCopy("./src/");
  eleventyConfig.addPlugin(syntaxHighlight, {
    preAttributes: {
      class: "code-block"
    },
    codeAttributes: {
      class: "code-elem"
    }
  });
  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss",
    outputPath: "/feed.xml",
    collection: {
      name: "articles",
      limit: 10,
    },
    metadata: {
      language: "en",
      title: "Michael Savych",
      subtitle: "A blog about programming through my discombobulated thoughts.",
      base: "http://localhost:8080/",
      author: {
        name: "Michael Savych",
      }
    }
  });
}