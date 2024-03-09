import { ContentRating,
    PagedResults,
    SearchRequest,
    SourceInfo,
    SourceIntents } from '@paperback/types'
import { DefaultScrappy,
    HomePageType,
    HomeSectionType,
    HTTP_METHOD,
    SectionBlock } from '../DefaultScrappy'
import { CheerioAPI } from 'cheerio'
import { Request } from '@paperback/types/src/generated/Exports/Request'
import { BlogTruyenParser } from './BlogTruyenParser'

const siteUrl = 'https://blogtruyenmoi.com'

// noinspection JSUnusedGlobalSymbols
export const BlogTruyenInfo: SourceInfo = {
    name: 'BlogTruyen',
    author: 'haipham22',
    contentRating: ContentRating.MATURE,
    icon: 'img.png',
    version: '1.0.0',
    description: 'BlogTruyen Tracker',
    websiteBaseURL: siteUrl,
    authorWebsite: 'https://haipham.net',
    intents:
    SourceIntents.MANGA_CHAPTERS |
    SourceIntents.HOMEPAGE_SECTIONS |
    SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
}


export class BlogTruyen extends DefaultScrappy<BlogTruyenParser>{
    constructor(cherrio: CheerioAPI) {
        const blogTruyenParser = new BlogTruyenParser(cherrio, siteUrl)
        super(cherrio, siteUrl, blogTruyenParser)
    }

    getHomeSection(): SectionBlock[] {
        return [
            {
                id: HomePageType.NEW_ADDED,
                type: HomeSectionType.singleRowNormal,
                rootSelector: '#top-newest-story',
                title: 'Truyện mới đăng',
                containsMoreItems: false,
            },
            {
                id: HomePageType.FEATURED,
                type: HomeSectionType.singleRowNormal,
                rootSelector: '.list-mainpage',
                title: 'Danh sách',
                containsMoreItems: true,
                url: 'thumb'
            },
        ]
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    override async getViewMoreItems(
        homepageSectionId: string,
        metadata: any
    ): Promise<PagedResults> {
        let url = ''
        switch (homepageSectionId as HomePageType) {
            case HomePageType.HOT:
                url = 'hot'
                break
            case HomePageType.FEATURED:
            default:
                url = ''
                break
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return super.getViewMoreItems(homepageSectionId, {
            ...metadata,
            url,
        })
    }

    override async getSearchResults(
        query: SearchRequest,
        metadata: any
    ): Promise<PagedResults> {
        return super.getSearchResults(query, {
            ...metadata,
            url: 'tim-truyen',
            params: {
                keyword: query.title,
            },
        })
    }

    override async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: this.siteUrl,
            method: HTTP_METHOD.GET,
        })
    }
}
