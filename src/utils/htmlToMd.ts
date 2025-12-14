import * as cheerio from "cheerio"
import type { AnyNode, Element, Node } from "domhandler"
import TurndownService from "turndown"

export function HtmlToMarkdown($: cheerio.CheerioAPI){
    const turndown = new TurndownService();
    const markdown = turndown.turndown($.html());
    return markdown;
}