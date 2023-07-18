import { CheerioAPI } from 'cheerio'
import { Chapter, ChapterDetails, HomeSection, PagedResults, Source, SourceManga } from '@paperback/types'
import { DefaultParser } from './DefaultParser'

export interface SectionBlock extends Omit<HomeSection, 'items' | 'id'> {
  rootSelector?: string
  type: HomeSectionType
  id: HomePageType
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

export abstract class DefaultScrappy extends Source {
  protected abstract siteUrl: string
  protected parser: DefaultParser

  protected constructor(cheerio: CheerioAPI) {
    super(cheerio)
    this.parser = new DefaultParser(cheerio)
  }

  requestManager = App.createRequestManager({
    requestsPerSecond: 5,
    requestTimeout: 10000,
  })

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  // @ts-ignore
  getMangaShareUrl(mangaId: string) {
    return mangaId
  }

  abstract getHomeSection(): SectionBlock[]

  // @ts-ignore
  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
    const request = App.createRequest({
      url: this.siteUrl,
      method: HTTP_METHOD.GET,
    })

    const { data } = await this.requestManager.schedule(request, 3)
    const $ = this.cheerio.load(data || '')

    for (const section of this.getHomeSection()) {
      sectionCallback(
        App.createHomeSection({
          ...section,
          items: this.parser.parserListManga($, section.rootSelector).map(item => App.createPartialSourceManga(item)),
        }),
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  override async getViewMoreItems?(_homepageSectionId: string, metadata: any): Promise<PagedResults> {
    const page: number = metadata?.page ?? 1
    const param = { page }
    const url = metadata?.url || ''

    const encodedParams = Object.entries(param)
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join('&')

    const request = App.createRequest({
      url: `${this.siteUrl}/${url}?${encodedParams}`,
      method: HTTP_METHOD.GET,
    })

    const response = await this.requestManager.schedule(request, 3)
    const $ = this.cheerio.load(response?.data || '')

    const manga = this.parser.parserListManga($)
    metadata = { ...metadata, page: page + 1 }

    return App.createPagedResults({
      results: manga.map(i => App.createPartialSourceManga(i)),
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
      mangaInfo: App.createMangaInfo(mangaInfo),
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
    return chapters.map(book =>
      App.createChapter({
        id: book.id,
        chapNum: Number(book.chapNum),
        langCode: 'vi',
        name: `${book.name}`,
        // time: book.time,
        sortingIndex: book.sortingIndex,
      }),
    )
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
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
