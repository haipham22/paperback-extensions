import { CheerioAPI } from 'cheerio'
import {
    Chapter,
    ChapterDetails,
    HomeSection,
    PagedResults,
    SearchRequest,
    SourceManga,
} from '@paperback/types'
import { DefaultParser } from './DefaultParser'
import { Request } from '@paperback/types/src/generated/Exports/Request'
import { SourceInterceptor } from '@paperback/types/src/generated/_exports'
import { Source } from '@paperback/types/lib'

export interface SectionBlock extends Omit<HomeSection, 'items' | 'id'> {
    rootSelector?: string;
    type: HomeSectionType;
    id: HomePageType;
    url?: string;
}

export enum HomePageType {
    FEATURED = 'FEATURED',
    VIEWEST = 'VIEWEST',
    HOT = 'HOT',
    NEW_UPDATED = 'NEW_UPDATED',
    NEW_ADDED = 'NEW_ADDED',
    FULL = 'FULL',
}

export enum HomeSectionType {
    singleRowNormal = 'singleRowNormal',
    singleRowLarge = 'singleRowLarge',
    doubleRow = 'doubleRow',
    featured = 'featured',
}

export enum HTTP_METHOD {
    GET = 'GET',
}

export class ScrappyRequestInterceptor implements SourceInterceptor {
    constructor(private readonly siteUrl: string) {}

    interceptRequest(request: Request): Promise<Request> {
        request.headers = {
            ...(request.headers ?? {}),
            ...{
                referer: this.siteUrl,
            },
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return request
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    interceptResponse(response: Response): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
        return response
    }
}

export abstract class DefaultScrappy<T extends DefaultParser> extends Source {
    protected constructor(
        cheerio: CheerioAPI,
        protected siteUrl: string,
        private parser: T
    ) {
        super(cheerio)
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    requestManager = App.createRequestManager({
        requestsPerSecond: 5,
        requestTimeout: 10000,
    });

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    override getMangaShareUrl(mangaId: string) {
        return mangaId
    }

    abstract getHomeSection(): SectionBlock[];

    async getRawHtml(req: Request): Promise<CheerioAPI> {
        const { data } = await this.requestManager.schedule(req, 3)
        return this.cheerio.load(data || '')
    }

    override async getHomePageSections(
        sectionCallback: (section: HomeSection) => void
    ): Promise<void> {
        const $ = await this.getRawHtml(
            App.createRequest({
                url: this.siteUrl,
                method: HTTP_METHOD.GET,
            })
        )

        for (const section of this.getHomeSection()) {
            if (section?.url) {
                const $doc = await this.getRawHtml(
                    App.createRequest({
                        url: this.siteUrl + '/' + section.url,
                        method: HTTP_METHOD.GET,
                    })
                )
                sectionCallback(
                    App.createHomeSection({
                        ...section,
                        items: this.parser
                            .parserListManga($doc, section.rootSelector)
                            .map((item) => App.createPartialSourceManga(item)),
                    })
                )
                continue
            }
            sectionCallback(
                App.createHomeSection({
                    ...section,
                    items: this.parser
                        .parserListManga($, section.rootSelector)
                        .map((item) => App.createPartialSourceManga(item)),
                })
            )
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    override async getViewMoreItems?(
        _homepageSectionId: string,
        metadata: any
    ): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1
        const param = { page }
        const url = metadata?.url || ''

        const encodedParams = Object.entries(param)
            .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
            .join('&')

        const $ = await this.getRawHtml(
            App.createRequest({
                url: `${this.siteUrl}/${url}?${encodedParams}`,
                method: HTTP_METHOD.GET,
            })
        )

        const manga = this.parser.parserListManga($)
        metadata = !this.parser.isLastPage($)
            ? { ...metadata, page: page + 1 }
            : undefined

        return App.createPagedResults({
            results: manga.map((i) => App.createPartialSourceManga(i)),
            metadata,
        })
    }

    async getSearchResults(
        _query: SearchRequest,
        metadata: any
    ): Promise<PagedResults> {
        const page: number = metadata?.page || 1
        const param: Record<string, any> = { ...(metadata?.params || {}), page }
        const url = metadata?.url || ''

        const encodedParams = Object.entries(param)
            .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
            .join('&')

        const request = App.createRequest({
            url: `${this.siteUrl}/${url}?${encodedParams}`,
            method: 'GET',
        })

        const $ = await this.getRawHtml(request)
        const tiles = this.parser.parserListManga($)

        metadata = !this.parser.isLastPage($) ? { page: page + 1 } : undefined

        return App.createPagedResults({
            results: tiles.map((i) => App.createPartialSourceManga(i)),
            metadata,
        })
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: mangaId,
            method: HTTP_METHOD.GET,
        })
        const { data } = await this.requestManager.schedule(request, 3)
        const $ = this.cheerio.load(data || '')
        const mangaInfo = this.parser.parserMangaInfo($)
        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                ...mangaInfo,
                image: mangaInfo.image
                    ? mangaInfo.image
                    : 'https://i.imgur.com/GYUxEX8.png',
            }),
        })
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: mangaId,
            method: HTTP_METHOD.GET,
        })
        const { data } = await this.requestManager.schedule(request, 3)
        const $ = this.cheerio.load(data || '')
        const chapters = this.parser.parseChapterList($)
        return chapters.map((book) =>
            App.createChapter({
                id: book.id,
                chapNum: Number(book.chapNum),
                langCode: 'vi',
                name: `${book.name}`,
                time: book.time,
                sortingIndex: book.sortingIndex,
            })
        )
    }

    async getChapterDetails(
        mangaId: string,
        chapterId: string
    ): Promise<ChapterDetails> {
        const request = App.createRequest({
            url: chapterId,
            method: HTTP_METHOD.GET,
        })
        const { data } = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(data || '')
        const pages = this.parser.parseChapterDetails($)
        return App.createChapterDetails({
            pages: pages,
            id: chapterId,
            mangaId: mangaId,
        })
    }
}
