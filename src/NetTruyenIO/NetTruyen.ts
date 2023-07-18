import { ContentRating, PagedResults, SearchRequest, SourceInfo, SourceIntents } from '@paperback/types'
import { DefaultScrappy, HomePageType, HomeSectionType, SectionBlock } from '../DefaultScrappy'
import { DefaultParser } from '../DefaultParser'
import { CheerioAPI } from 'cheerio'

const siteUrl = 'https://www.nettruyenio.com/'

// noinspection JSUnusedGlobalSymbols
export const NetTruyenInfo: SourceInfo = {
  name: 'NetTruyen',
  author: 'haipham22',
  contentRating: ContentRating.MATURE,
  icon: 'icon.png',
  version: '1.0.1',
  description: 'NetTruyen Tracker',
  websiteBaseURL: siteUrl,
  intents: SourceIntents.MANGA_TRACKING | SourceIntents.HOMEPAGE_SECTIONS,
}

export class NetTruyenParser extends DefaultParser {
  override parserImg($doc: unknown, $el?: unknown): string | undefined {
    const link = super.parserImg($doc, $el)
    if (link?.indexOf('https') === -1) {
      return 'https:' + link
    }
    if (link?.indexOf('http') === -1) {
      return 'http:' + link
    }
    return link
  }
}

export class NetTruyen extends DefaultScrappy {
  siteUrl = siteUrl

  constructor(cherrio: CheerioAPI) {
    super(cherrio)
    this.parser = new NetTruyenParser(cherrio)
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
        id: HomePageType.NEW_UPDATED,
        type: HomeSectionType.singleRowNormal,
        title: 'Mới cập nhật',
        containsMoreItems: true,
      },
    ]
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  override async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return await super.getViewMoreItems(homepageSectionId, {
      ...metadata,
      sort: 12,
      status: -1,
      url: 'tim-truyen',
    })
  }

  async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
    let page = metadata?.page || 1

    const search = {
      genres: '',
      gender: '-1',
      status: '-1',
      minchapter: '1',
      sort: '0',
    }

    const url = `${this.siteUrl}`
    const request = App.createRequest({
      url: query.title ? url + '/tim-truyen' : url + '/tim-truyen-nang-cao',
      method: 'GET',
      param: encodeURI(
        `?keyword=${query.title ?? ''}&genres=${search.genres}&gender=${search.gender}&status=${
          search.status
        }&minchapter=${search.minchapter}&sort=${search.sort}&page=${page}`,
      ),
    })

    const data = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data.data || '')
    const tiles = this.parser.parserListManga($)

    metadata = !this.isLastPage($) ? { page: page + 1 } : undefined

    return App.createPagedResults({
      results: tiles,
      metadata,
    })
  }

  isLastPage = ($: CheerioAPI): boolean => {
    const current = $('ul.pagination > li.active > a').text()
    let total = $('ul.pagination > li.PagerSSCCells:last-child').text()

    if (current) {
      total = total ?? ''
      return +total === +current //+ => convert value to number
    }
    return true
  }
}
