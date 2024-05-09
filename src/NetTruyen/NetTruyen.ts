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
import { NetTruyenParser } from './NetTruyenParser'

const siteUrl = 'https://www.nettruyencc.com'

// noinspection JSUnusedGlobalSymbols
export const NetTruyenInfo: SourceInfo = {
    name: 'NetTruyen',
    author: 'haipham22',
    contentRating: ContentRating.MATURE,
    icon: 'icon.png',
    version: '2.0.13',
    description: 'NetTruyen Tracker',
    websiteBaseURL: siteUrl,
    intents:
    SourceIntents.MANGA_CHAPTERS |
    SourceIntents.HOMEPAGE_SECTIONS |
    SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
}


export class NetTruyen extends DefaultScrappy<NetTruyenParser>{
    constructor(cherrio: CheerioAPI) {
        super(cherrio, siteUrl, new NetTruyenParser(cherrio))
    }

    getHomeSection(): SectionBlock[] {
        return [
            {
                id: HomePageType.FEATURED,
                type: HomeSectionType.singleRowNormal,
                rootSelector: 'div.altcontent1',
                title: 'Truyện đề cử',
                containsMoreItems: false,
            },
            {
                id: HomePageType.HOT,
                type: HomeSectionType.singleRowNormal,
                rootSelector: '.center-side',
                title: 'Truyện đang hot',
                containsMoreItems: true,
                url: 'hot',
            },
            {
                id: HomePageType.NEW_UPDATED,
                type: HomeSectionType.singleRowNormal,
                rootSelector: '.center-side',
                title: 'Mới cập nhật',
                containsMoreItems: true,
            },
        ]
    }

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

    constructHeaders(headers: any = {}, _refererPath?: string): any {
        return {
            ...headers,
            referer: `${this.siteUrl}/`
        }
    }

    override async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: this.siteUrl,
            method: HTTP_METHOD.GET,
            headers: this.constructHeaders()
        })
    }

    //TODO: add search tags
    // override getSearchTags(): Promise<TagSection[]> {
    //     const request = App.createRequest({
    //         url: this.siteUrl,
    //         method: 'GET',
    //     })
    //
    //     const $ = await this.getRawHtml(request)
    //
    //     return $('.dropdown-menu.megamenu nav li').map((_, $el) => ({
    //
    //     })).toArray().map(i => App.createTagSection(i))
    // }

    // async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
    //     const updateManga = []
    //     const pages = 10
    //     for (let i = 1; i < pages + 1; i++) {
    //         const $ = await this.getRawHtml(`${this.siteUrl}?page=${i}`)
    //         for (const manga of $('div.item', 'div.row').toArray()) {
    //             const id = $('figure.clearfix > div.image > a', manga).attr('href')?.split('/').pop()
    //             const time = $('figure.clearfix > figcaption > ul > li.chapter:nth-of-type(1) > i', manga).last().text().trim()
    //             updateManga.push(({
    //                 id: id,
    //                 time: time
    //             }))
    //         }
    //     }
    //
    //     const returnObject = this.parser.parserListManga(updateManga, time, ids)
    //     mangaUpdatesFoundCallback(createMangaUpdates(returnObject))
    // }

}
