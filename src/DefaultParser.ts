import { CheerioAPI } from 'cheerio'
import { PartialSourceManga } from '@paperback/types/src/generated/Exports/PartialSourceManga'
import { Chapter } from '@paperback/types'
import { MangaInfo } from '@paperback/types/src/generated/_exports'
import moment from 'moment'

export const ImgSelector: string[] = [
  'img.lazy',
  'img.lazyOwl',
  'div.col-image > img',
  '.center-side .detail-info .col-image img',
]

export const IdSelector: string[] = ['a']

export const AuthorSelector: string[] = ['.author > p:last-child', 'p:contains("Tác giả") + p']

export const TitleSelector: string[] = ['.center-side h1.title-detail']

export const ChapterListSelector: string[] = ['.list-chapter li']

export const TimeSelector: string[] = [
  'div:contains("giờ trước")',
  'div:contains("ngày trước")',
  'div:contains("tháng trước")',
]

export const SelectorInList: string[] = ['.item']

export const SectionInList: string[] = ['.center-side']

export const TitleInList: string[] = ['.center-side .slide-caption > h3', 'h3 a']

export const SubTitleInList: string[] = ['.slide-caption > a', '.comic-item li:first-child a']

export class DefaultParser {
  constructor(protected _cherrio: CheerioAPI) {}

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  parserListManga($doc: CheerioAPI, contextBlockSelector?: string) {
    contextBlockSelector = !contextBlockSelector ? SectionInList.join(',') : contextBlockSelector
    return $doc(SelectorInList.join(','), contextBlockSelector)
      .map((_, $el) => {
        return {
          title: $doc(TitleInList.join(','), $el)?.text()?.trim(),
          subtitle: $doc(SubTitleInList.join(','), $el)?.text()?.trim(),
          image: this.parserImg($doc, $el),
          mangaId: $doc(IdSelector.join(','), $el).attr('href')?.trim(),
        } as PartialSourceManga
      })
      .toArray()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  parserImg($doc: unknown, $el?: unknown) {
    if ($el) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return $doc(ImgSelector.join(','), $el).attr('src')?.trim()
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return $doc(ImgSelector.join(',')).attr('src')?.trim()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  parseRating(_$doc: unknown) {
    return 10
  }

  parserMangaInfo($: CheerioAPI): MangaInfo {
    return {
      author: $(AuthorSelector.join(',')).text(),
      artist: $(AuthorSelector.join(',')).text(),
      desc: $('.detail-content p').text(),
      titles: [$(TitleSelector.join(', ')).text()],
      image: this.parserImg($),
      status: $('.status > p + p').text(),
      rating: this.parseRating($),
      hentai: false,
    } as MangaInfo
  }

  // time format 14:33 15/06
  protected convertTime(timeAgo: string, format: string = 'hh:mm DD/MM'): Date {
    let time: Date
    try {
      let trimmed: number = Number((/\d*/.exec(timeAgo) ?? [])[0])
      trimmed = trimmed == 0 && timeAgo.includes('a') ? 1 : trimmed
      if (timeAgo.includes('giây') || timeAgo.includes('secs')) {
        time = new Date(Date.now() - trimmed * 1000) // => mili giây (1000 ms = 1s)
      } else if (timeAgo.includes('phút')) {
        time = new Date(Date.now() - trimmed * 60000)
      } else if (timeAgo.includes('giờ')) {
        time = new Date(Date.now() - trimmed * 3600000)
      } else if (timeAgo.includes('ngày')) {
        time = new Date(Date.now() - trimmed * 86400000)
      } else if (timeAgo.includes('năm')) {
        time = new Date(Date.now() - trimmed * 31556952000)
      } else {
        time = moment(timeAgo, format).toDate()
      }
    } catch (err) {
      time = new Date()
    }
    return time
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  parseChapterList($doc: CheerioAPI): Chapter[] {
    return $doc('.list-chapter li.row:not(.heading)')
      .map((_, $el) => {
        return {
          id: $doc('a', $el).attr('href'),
          chapNum: Number($doc('a', $el).data('id')),
          name: $doc('a', $el).text(),
          time: new Date(),
        } as Chapter
      })
      .toArray()
  }

  parseChapterDetails($doc: CheerioAPI): string[] {
    return $doc('div.reading-detail > div.page-chapter img')
      .toArray()
      .filter(obj => !obj.attribs['data-original'] || !obj)
      .map((obj): string => {
        const link = obj.attribs['data-original'] as string
        if (link.indexOf('http') === -1) {
          //nếu link ko có 'http'
          return 'http:' + link
        }
        return link
      })
  }
}
