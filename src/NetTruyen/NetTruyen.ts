import {
    Chapter,
    ContentRating,
    PagedResults,
    SearchRequest,
    SourceInfo,
    SourceIntents,
} from '@paperback/types'
import {
    DefaultScrappy,
    HomePageType,
    HomeSectionType,
    SectionBlock,
} from '../DefaultScrappy'
import { CheerioAPI } from 'cheerio'
import { DefaultParser } from '../DefaultParser'
import { PartialSourceManga } from '@paperback/types/src/generated/Exports/PartialSourceManga'
import { MangaInfo } from '@paperback/types/src/generated/_exports'

const siteUrl = 'https://www.nettruyenmax.com'

// noinspection JSUnusedGlobalSymbols
export const NetTruyenInfo: SourceInfo = {
    name: 'NetTruyen',
    author: 'haipham22',
    contentRating: ContentRating.MATURE,
    icon: 'icon.png',
    version: '2.0.2',
    description: 'NetTruyen Tracker',
    websiteBaseURL: siteUrl,
    intents:
    SourceIntents.MANGA_CHAPTERS |
    SourceIntents.HOMEPAGE_SECTIONS |
    SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
}

export class NetTruyenParser extends DefaultParser {
    constructor(_cherrio: CheerioAPI) {
        super(_cherrio)
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    parserListManga($doc: CheerioAPI, contextBlockSelector?: string) {
        contextBlockSelector = !contextBlockSelector
            ? '.center-side'
            : contextBlockSelector
        return $doc('.item', contextBlockSelector)
            .map((_, $el) => {
                return {
                    title: $doc('h3 a', $el)?.text()?.trim(),
                    subtitle: $doc(
                        '.slide-caption > a, .comic-item li:first-child a',
                        $el
                    )
                        ?.text()
                        ?.trim(),
                    image: this.parserImg($doc, $el),
                    mangaId: $doc('a', $el).attr('href')?.trim(),
                } as PartialSourceManga
            })
            .toArray()
    }

    parserMangaInfo($: CheerioAPI): MangaInfo {
        const img = $('.col-image img').attr('src')
        return {
            author: $('.author > p:last-child, p:contains(\'Tác giả\') + p').text(),
            artist: $('.author > p:last-child, p:contains(\'Tác giả\') + p').text(),
            desc: $('.detail-content p').text(),
            titles: [$('.center-side h1.title-detail').text()],
            image: img,
            status: $('.status > p + p').text(),
            hentai: false,
        } as MangaInfo
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    parseChapterList($doc: CheerioAPI): Chapter[] {
        return $doc('.list-chapter li.row:not(.heading)')
            .map((_, $el) => {
                const index = Number($doc('a', $el)?.data('id'))
                const [, chapNum] = ($doc('a', $el)?.text() || '').split(' ')
                return {
                    id: $doc('a', $el).attr('href'),
                    chapNum: Number(chapNum),
                    name: $doc('a', $el)?.text(),
                    time: this.convertTime($doc('.col-xs-4', $el).text(), 'hh:mm DD/MM'),
                    sortingIndex: index,
                } as Chapter
            })
            .toArray()
    }

    parseChapterDetails($doc: CheerioAPI): string[] {
        return $doc('.page-chapter', '.reading-detail')
            .map((_, obj): string => {
                return 'https:' + $doc('img', obj).data('original')
            })
            .toArray()
            .filter(Boolean)
    }

    parserImg($doc: unknown, $el?: unknown, useHttps = true): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
        let el = $doc('img')

        if ($el) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            el = $doc('img', $el)
        }

        const link = (el.data('src') || el.data('original'))?.trim()

        if (link === '') return 'https://i.imgur.com/GYUxEX8.png'

        if (link?.indexOf('https') === -1 && useHttps) {
            return 'https:' + link
        }
        if (link?.indexOf('http') === -1) {
            return 'http:' + link
        }
        return link
    }

    override isLastPage($doc: CheerioAPI): boolean {
        const $root = $doc('.pagination-outter')
        const currentPage = $doc('li.active', $root)?.text()
        const nextPage = $doc('li.active + li')?.text()

        return currentPage === (nextPage || '')
    }
}

export class NetTruyen extends DefaultScrappy<NetTruyenParser> {
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
}
