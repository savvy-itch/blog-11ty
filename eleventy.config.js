import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import rssPlugin from "@11ty/eleventy-plugin-rss";
import sitemap from "@quasibit/eleventy-plugin-sitemap";
import htmlmin from "html-minifier-terser";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("./public/styles/");
  eleventyConfig.addPassthroughCopy("./public/fonts/");
  eleventyConfig.addPassthroughCopy("./public/images/");
  eleventyConfig.addPassthroughCopy("./src/");
  eleventyConfig.addPassthroughCopy("./robots.txt");

  eleventyConfig.addPlugin(syntaxHighlight, {
    preAttributes: {
      class: "code-block"
    },
    codeAttributes: {
      class: "code-elem"
    }
  });
  eleventyConfig.addPlugin(sitemap, {
    sitemap: {
      hostname: "https://blogsavvyitch.netlify.app/",
    }
  });
  eleventyConfig.addPlugin(rssPlugin);

  eleventyConfig.addFilter('localeDate', function (str) {
    const d = new Date(str);
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  });
  eleventyConfig.addFilter('pluralize', function (n) {
    return n === 1 ? '' : 's';
  });

  eleventyConfig.addTransform("htmlmin", function (content) {
    if ((this.page.outputPath || "").endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }
    return content;
  });
};

export const config = {
  htmlTemplateEngine: "njk",
  dir: {
    input: "content",
    includes: "../_includes",
    data: "../_data",
    output: "_site"
  }
};
