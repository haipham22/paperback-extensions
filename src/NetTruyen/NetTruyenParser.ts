import { DefaultParser } from '../DefaultParser'
import { CheerioAPI } from 'cheerio'
import { PartialSourceManga } from '@paperback/types/src/generated/Exports/PartialSourceManga'
import { MangaInfo } from '@paperback/types/src/generated/_exports'
import { Chapter } from '@paperback/types'

export class NetTruyenParser extends DefaultParser {
    constructor(_cherrio: CheerioAPI) {
        super(_cherrio)
    }

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
        return {
            author: $('.author > p:last-child, p:contains(\'Tác giả\') + p').text(),
            artist: $('.author > p:last-child, p:contains(\'Tác giả\') + p').text(),
            desc: $('.detail-content p').text(),
            titles: [$('.center-side h1.title-detail').text()],
            image: this.parserImg($, $('.col-image')),
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

        const link = (el.data('src') || el.data('original') || el.attr('src'))?.trim()

        if (link === '') return 'https://i.imgur.com/GYUxEX8.png'

        if (link?.indexOf('https') === -1 && useHttps) {
            return 'https:' + link
        }
        if (link?.indexOf('http') === -1) {
            return 'http:' + link
        }
        return link
    }

    isLastPage($doc: CheerioAPI): boolean {
        const $root = $doc('.pagination-outter')
        const currentPage = $doc('li.active', $root)?.text()
        const nextPage = $doc('li.active + li')?.text()

        return currentPage === (nextPage || '')
    }
}
