import {
  Chapter,
  ChapterDetails,
  ContentRating,
  HomeSection,
  HomeSectionType,
  LanguageCode,
  Manga,
  MangaTile,
  PagedResults,
  Request,
  Response,
  SearchRequest,
  Source,
  SourceInfo,
  Tag,
  TagSection,
  TagType,
} from 'paperback-extensions-common'

import { convertTime, isLastPage, parseSearch } from './VcomicParser'
import CheerioAPI = cheerio.CheerioAPI
import { decodeHTMLEntity } from './VcomicParser'
import { SourceTagEnum } from '../enum_helper'

const DOMAIN = 'https://vcomic.net'
const method = 'GET'

export enum HomePage {
  TOP_COMIC = 'TOP_COMIC',
  LAST_UPDATE = 'LAST_UPDATE',
}

export const VcomicInfo: SourceInfo = {
  version: '1.0.0',
  name: 'Vcomic',
  icon: 'icon.png',
  author: 'haipham22',
  authorWebsite: 'https://github.com/haipham22',
  description: 'Extension that pulls manga from Vcomic',
  websiteBaseURL: `${DOMAIN}`,
  contentRating: ContentRating.MATURE,
  sourceTags: [
    {
      text: SourceTagEnum.RECOMMENDED,
      type: TagType.BLUE,
    },
  ],
}

export class Vcomic extends Source {
  override getMangaShareUrl(mangaId: string): string {
    return mangaId
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
    const request = createRequestObject({
      url: mangaId,
      method,
    })
    const { data } = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data) as CheerioAPI
    let tags: Tag[] = []
    const genres = []
    let status = 1
    let desc = $('.detail-content').text()
    let genresEls = $('a', '.list-info > .kind.row').toArray()
    for (const genresEl of genresEls) {
      const genre = $(genresEl).text().trim()
      const id = $(genresEl).attr('href')?.trim() ?? genre
      tags.push(createTag({ label: genre, id }))
      genres.push({
        label: genre,
        id: DOMAIN + id,
      })
    }
    const image = $('img', '.detail-info > .col-image').attr('src') ?? 'fuck'
    const creator = $('.list-info .author .name').next().text()

    return createManga({
      id: mangaId,
      author: creator,
      artist: creator,
      desc,
      titles: [$('.manga-info > h3').text()],
      image: image.includes('http') ? image : 'https:' + image,
      status,
      hentai: false,
      tags: [createTagSection({ label: 'genres', tags: tags, id: '0' })],
    })
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const request = createRequestObject({
      url: mangaId,
      method,
    })
    const { data } = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(data) as CheerioAPI
    return $('li.row', '.list_chapter', data)
      .toArray()
      .reverse()
      .map((rawChapter, index) => {
        let $chapter = $('.chapter > a', rawChapter)
        return createChapter(<Chapter>{
          id: `${DOMAIN}/${$chapter.attr('href')}`,
          chapNum: index,
          name: $('a', rawChapter).attr('title'),
          mangaId: mangaId,
          langCode: LanguageCode.VIETNAMESE,
          time: convertTime($('.col-xs-4', rawChapter).text().trim()),
        })
      })
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
    const request = createRequestObject({
      url: chapterId,
      // url: 'https://vcomic.net/doc-toan-chuc-phap-su-chuong-987.html',
      method,
    })

    const { data } = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data) as CheerioAPI
    let pages = $('.page-chapter', '.reading-detail.box_doc')
      .toArray()
      .map(item => encodeURI($('img', item).first().attr('src')?.trim() || ''))
    return createChapterDetails({
      id: chapterId,
      mangaId: mangaId,
      pages,
      longStrip: false,
    })
  }

  override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
    const hot: HomeSection = createHomeSection({
      id: HomePage.TOP_COMIC,
      title: 'TRUYỆN ĐỀ CỬ',
      view_more: false,
      type: HomeSectionType.featured,
    })
    const newUpdated: HomeSection = createHomeSection({
      id: HomePage.LAST_UPDATE,
      title: 'TRUYỆN MỚI CẬP NHẬT',
      view_more: true,
    })

    //Load empty sections
    sectionCallback(newUpdated)
    sectionCallback(hot)

    ///Get the section data
    // Hot
    let request = createRequestObject({
      url: DOMAIN,
      method: 'GET',
    })
    let { data } = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data)

    newUpdated.items = this.parseLastUpdateItems($)

    sectionCallback(newUpdated)

    hot.items = $('.item', '.top-comics')
      .toArray()
      .map(($mangaItemEl: Element) => {
        let $titleEl = $('.slide-caption h3 a', $mangaItemEl)
        const title = $titleEl.text().trim()
        const id = DOMAIN + $titleEl.attr('href')
        let image = $('img.lazyOwl', $mangaItemEl).attr('src') ?? ''
        if (!image.startsWith('https')) image = 'https:' + image
        const sub = $('.slide-caption > a', $mangaItemEl).text().trim()
        return createMangaTile(<MangaTile>{
          id,
          image: image,
          title: createIconText({ text: decodeHTMLEntity(title) }),
          subtitleText: createIconText({ text: sub }),
        })
      })
    sectionCallback(hot)

    //New Updates
  }

  private parseLastUpdateItems($: CheerioAPI) {
    return $('.center-side .items .item')
      .toArray()
      .map(manga => {
        let titleEl = $('.image a', manga)
        const title = titleEl.text().trim()
        const id = DOMAIN + titleEl?.attr('href')?.trim() ?? title
        const image = $('img', titleEl).attr('src')
        const sub = $('.chapter a', manga).first().text().trim()
        return createMangaTile({
          id: id,
          image: image?.includes('http') ? image : 'https:' + image,
          title: createIconText({
            text: title,
          }),
          subtitleText: createIconText({
            text: sub,
          }),
        })
      })
  }

  override async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
    let page: number = metadata?.page ?? 1
    let param = ''
    let url = ''
    switch (homepageSectionId as HomePage) {
      case HomePage.LAST_UPDATE:
        url = `${DOMAIN}?page=${page}`
        break
      default:
        return Promise.resolve(createPagedResults({ results: [] }))
    }

    const request = createRequestObject({
      url,
      method,
      param,
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)

    const manga = this.parseLastUpdateItems($)
    metadata = !isLastPage($) ? { page: page + 1 } : undefined
    return createPagedResults({
      results: manga,
      metadata,
    })
  }

  async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
    const request = createRequestObject({
      url: encodeURI(`${DOMAIN}/app/manga/controllers/cont.suggestSearch.php?q=${query.title}`),
      method: 'GET',
    })

    const { data } = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data)
    const tiles = parseSearch($)

    return createPagedResults({
      results: tiles,
      metadata,
    })
  }

  override async getSearchTags(): Promise<TagSection[]> {
    const request = createRequestObject({
      url: DOMAIN,
      method: 'GET',
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    const arrayTags: Tag[] = []
    const collectedIds: string[] = []
    //the loai
    for (const tag of $('div:not(:last-child) ul.nav', '.megamenu > li').toArray()) {
      for (const gen of $('a', tag).toArray()) {
        const label = $(gen).text().trim()
        const id = $(gen).attr('href') ?? label
        if (!id || !label) continue
        if (!collectedIds.includes(id)) {
          arrayTags.push({ id: id, label: label })
          collectedIds.push(id)
        }
      }
    }
    const tagSections: TagSection[] = [
      createTagSection({ id: '0', label: 'Thể Loại', tags: arrayTags.map(x => createTag(x)) }),
    ]
    return tagSections
  }
}
