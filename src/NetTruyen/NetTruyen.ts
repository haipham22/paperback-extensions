import {
  Chapter,
  ChapterDetails,
  ContentRating,
  HomeSection,
  HomeSectionType,
  Manga,
  MangaUpdates,
  PagedResults,
  Request,
  Response,
  SearchRequest,
  Source,
  SourceInfo,
  TagSection,
  TagType,
} from 'paperback-extensions-common'
import { Parser } from './NetTruyenParser'
import { HomePageType } from '../enum_helper'
import CheerioAPI = cheerio.CheerioAPI

const DOMAIN = 'https://nettruyenup.com'

export const isLastPage = ($: CheerioAPI): boolean => {
  const current = $('ul.pagination > li.active > a').text()
  let total = $('ul.pagination > li.PagerSSCCells:last-child').text()

  if (current) {
    total = total ?? ''
    return +total === +current //+ => convert value to number
  }
  return true
}

export const NetTruyenInfo: SourceInfo = {
  version: '1.0.0',
  name: 'NetTruyen',
  icon: 'icon.png',
  author: 'haipham22',
  authorWebsite: 'https://github.com/haipham22',
  description: 'Extension that pulls manga from NetTruyen.',
  websiteBaseURL: DOMAIN,
  contentRating: ContentRating.MATURE,
  sourceTags: [
    {
      text: 'Recommended',
      type: TagType.BLUE,
    },
    {
      text: 'Notifications',
      type: TagType.GREEN,
    },
  ],
}

export class NetTruyen extends Source {
  parser = new Parser()

  override getMangaShareUrl(mangaId: string): string {
    return `${DOMAIN}/truyen-tranh/${mangaId}`
  }

  requestManager = createRequestManager({
    requestsPerSecond: 5,
    requestTimeout: 20000,
    interceptor: {
      interceptRequest: async (request: Request): Promise<Request> => {
        request.headers = {
          ...(request.headers ?? {}),
          ...{
            referer: DOMAIN,
          },
        }

        return request
      },

      interceptResponse: async (response: Response): Promise<Response> => {
        return response
      },
    },
  })

  async getMangaDetails(mangaId: string): Promise<Manga> {
    const url = `${DOMAIN}/truyen-tranh/${mangaId}`
    const request = createRequestObject({
      url: url,
      method: 'GET',
    })
    const { data } = await this.requestManager.schedule(request, 1)
    return this.parser.parseMangaDetails(this.cheerio.load(data), mangaId)
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const url = `${DOMAIN}/truyen-tranh/${mangaId}`
    const request = createRequestObject({
      url: url,
      method: 'GET',
    })
    const { data } = await this.requestManager.schedule(request, 1)
    return this.parser.parseChapterList(this.cheerio.load(data), mangaId)
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
    const request = createRequestObject({
      url: chapterId,
      method: 'GET',
    })
    const { data } = await this.requestManager.schedule(request, 1)
    const pages = this.parser.parseChapterDetails(this.cheerio.load(data))
    return createChapterDetails({
      pages: pages,
      longStrip: false,
      id: chapterId,
      mangaId: mangaId,
    })
  }

  async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
    let page = metadata?.page ?? 1

    const search = {
      genres: '',
      gender: '-1',
      status: '-1',
      minchapter: '1',
      sort: '0',
    }

    const tags = query.includedTags?.map(tag => tag.id) ?? []
    const genres: string[] = []
    tags.map(value => {
      if (value.indexOf('.') === -1) {
        genres.push(value)
      } else {
        switch (value.split('.')[0]) {
          case 'minchapter':
            search.minchapter = value.split('.')[1]
            break
          case 'gender':
            search.gender = value.split('.')[1]
            break
          case 'sort':
            search.sort = value.split('.')[1]
            break
          case 'status':
            search.status = value.split('.')[1]
            break
        }
      }
    })
    search.genres = (genres ?? []).join(',')
    const url = `${DOMAIN}`
    const request = createRequestObject({
      url: query.title ? url + '/tim-truyen' : url + '/tim-truyen-nang-cao',
      method: 'GET',
      param: encodeURI(
        `?keyword=${query.title ?? ''}&genres=${search.genres}&gender=${search.gender}&status=${
          search.status
        }&minchapter=${search.minchapter}&sort=${search.sort}&page=${page}`,
      ),
    })

    const data = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data.data)
    const tiles = this.parser.parseSearchResults($)

    metadata = !isLastPage($) ? { page: page + 1 } : undefined

    return createPagedResults({
      results: tiles,
      metadata,
    })
  }

  override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
    let featured: HomeSection = createHomeSection({
      id: HomePageType.FEATURED,
      title: 'Truyện Đề Cử',
      type: HomeSectionType.featured,
    })
    let viewest: HomeSection = createHomeSection({
      id: HomePageType.VIEWEST,
      title: 'Truyện Xem Nhiều Nhất',
      view_more: true,
    })
    let hot: HomeSection = createHomeSection({
      id: HomePageType.HOT,
      title: 'Truyện Hot Nhất',
      view_more: true,
    })
    let newUpdated: HomeSection = createHomeSection({
      id: HomePageType.NEW_UPDATED,
      title: 'Truyện Mới Cập Nhật',
      view_more: true,
    })
    let newAdded: HomeSection = createHomeSection({
      id: HomePageType.NEW_ADDED,
      title: 'Truyện Mới Thêm Gần Đây',
      view_more: true,
    })
    let full: HomeSection = createHomeSection({
      id: HomePageType.FULL,
      title: 'Truyện Đã Hoàn Thành',
      view_more: true,
    })

    //Load empty sections
    sectionCallback(featured)
    sectionCallback(viewest)
    sectionCallback(hot)
    sectionCallback(newUpdated)
    sectionCallback(newAdded)
    sectionCallback(full)

    ///Get the section data
    //Featured
    let request = createRequestObject({
      url: DOMAIN,
      method: 'GET',
    })
    let data = await this.requestManager.schedule(request, 1)

    let homePageHtml = this.cheerio.load(data)
    featured.items = this.parser.parseFeaturedSection(homePageHtml)
    sectionCallback(featured)

    //View
    request = createRequestObject({
      url: `${DOMAIN}/tim-truyen`,
      method: 'GET',
      param: '?status=-1&sort=10',
    })
    data = await this.requestManager.schedule(request, 1)

    viewest.items = this.parser.parsePopularSection(this.cheerio.load(data.data))

    sectionCallback(viewest)

    //Hot
    request = createRequestObject({
      url: `${DOMAIN}/hot`,
      method: 'GET',
    })
    data = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data.data)

    hot.items = this.parser.parseHotSection($)
    sectionCallback(hot)

    //New Updates
    newUpdated.items = this.parser.parseNewUpdatedSection(homePageHtml)
    sectionCallback(newUpdated)

    //New added
    request = createRequestObject({
      url: `${DOMAIN}/tim-truyen`,
      method: 'GET',
      param: '?status=-1&sort=15',
    })
    data = await this.requestManager.schedule(request, 1)

    newAdded.items = this.parser.parseNewAddedSection(this.cheerio.load(data.data))
    sectionCallback(newAdded)

    //Full
    request = createRequestObject({
      url: `${DOMAIN}/truyen-full`,
      method: 'GET',
    })
    data = await this.requestManager.schedule(request, 1)

    full.items = this.parser.parseFullSection(this.cheerio.load(data.data))
    sectionCallback(full)
  }

  override async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
    let page: number = metadata?.page ?? 1
    let param = ''
    let url = ''
    switch (homepageSectionId as HomePageType) {
      case HomePageType.VIEWEST:
        param = `?status=-1&sort=10&page=${page}`
        url = `tim-truyen`
        break
      case HomePageType.HOT:
        param = `?page=${page}`
        url = `hot`
        break
      case HomePageType.NEW_UPDATED:
        param = `?page=${page}`
        url = DOMAIN
        break
      case HomePageType.NEW_ADDED:
        param = `?status=-1&sort=15&page=${page}`
        url = `tim-truyen`
        break
      case HomePageType.FULL:
        param = `?page=${page}`
        url = `truyen-full`
        break
      default:
        throw new Error("Requested to getViewMoreItems for a section ID which doesn't exist")
    }

    const request = createRequestObject({
      url: `${DOMAIN}/${url}`,
      method: 'GET',
      param,
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)

    const manga = this.parser.parseViewMoreItems($)
    metadata = isLastPage($) ? undefined : { page: page + 1 }

    return createPagedResults({
      results: manga,
      metadata,
    })
  }

  override async getSearchTags(): Promise<TagSection[]> {
    const url = `${DOMAIN}/tim-truyen-nang-cao`
    const request = createRequestObject({
      url: url,
      method: 'GET',
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    return this.parser.parseTags($)
  }

  override async filterUpdatedManga(
    mangaUpdatesFoundCallback: (updates: MangaUpdates) => void,
    time: Date,
    ids: string[],
  ): Promise<void> {
    const updateManga: any = []
    const pages = 10
    for (let i = 1; i < pages + 1; i++) {
      const request = createRequestObject({
        url: `${DOMAIN}/?page=${i}`,
        method: 'GET',
      })
      const response = await this.requestManager.schedule(request, 1)
      const $ = this.cheerio.load(response.data)
      // let x = $('time.small').text().trim();
      // let y = x.split("lúc:")[1].replace(']', '').trim().split(' ');
      // let z = y[1].split('/');
      // const timeUpdate = new Date(z[1] + '/' + z[0] + '/' + z[2] + ' ' + y[0]);
      // updateManga.push({
      //     id: item,
      //     time: timeUpdate
      // })
      for (let manga of $('div.item', 'div.row').toArray()) {
        const id = $('figure.clearfix > div.image > a', manga).attr('href')?.split('/').pop()
        const time = $('figure.clearfix > figcaption > ul > li.chapter:nth-of-type(1) > i', manga).last().text().trim()
        updateManga.push({
          id: id,
          time: time,
        })
      }
    }

    const returnObject = this.parser.parseUpdatedManga(updateManga, time, ids)
    mangaUpdatesFoundCallback(createMangaUpdates(returnObject))
  }
}
