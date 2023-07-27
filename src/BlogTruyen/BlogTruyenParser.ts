import { DefaultParser } from '../DefaultParser'
import { CheerioAPI } from 'cheerio'
import { PartialSourceManga } from '@paperback/types/src/generated/Exports/PartialSourceManga'
import { MangaInfo } from '@paperback/types/src/generated/_exports'
import { Chapter } from '@paperback/types'
import * as entities from 'entities'

export class BlogTruyenParser extends DefaultParser {
    constructor(_cherrio: CheerioAPI, private siteUrl: string) {
        super(_cherrio)
    }

    decodeString(str: string) {
        return entities.decode(str)
    }

    parserListManga($doc: CheerioAPI, contextBlockSelector?: string): PartialSourceManga[] {
        switch (contextBlockSelector) {
            case '.list-mainpage':
                return $doc('.storyitem', contextBlockSelector)
                    .map((_, $el) => {
                        return {
                            title: this.decodeString($doc('h3 a',$el).attr('title')?.trim() || ''),
                            image: this.parserImg($doc, $el),
                            mangaId: this.siteUrl + $doc('h3 a',$el).attr('href')?.trim(),
                        } as PartialSourceManga
                    })
                    .toArray()
            case '#top-newest-story':
                return $doc('a',contextBlockSelector)
                    .map((_, $el) => {
                        return {
                            title: this.decodeString($doc($el).attr('title')?.trim() || ''),
                            image: this.parserImg($doc, $el),
                            mangaId: this.siteUrl + $doc($el).attr('href')?.trim(),
                        } as PartialSourceManga
                    })
                    .toArray()
            default:
                return []
        }
    }

    parserMangaInfo($: CheerioAPI): MangaInfo {
        return {
            author: $('.description p:contains(\'Tác giả\') > p').text(),
            artist: $('.description p:contains(\'Tác giả\') > p').text(),
            status: $('.description p:contains(\'Trạng thái\') > span').text(),
            desc: $('.content').text(),
            titles: [$('h1 a').text()],
            image: this.parserImg($, $('.thumbnail')),
            hentai: false,
        } as MangaInfo
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    parseChapterList($doc: CheerioAPI): Chapter[] {
        return $doc('p','.list-chapters #list-chapters')
            .map((_, $el) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const sortIndexStr = $doc('a', $el)?.attr('id') || ''
                const [, sortIndex] = sortIndexStr.split('_')
                const index = Number(sortIndex)
                const [, chapNum] = $doc('a', $el)?.text()?.trim().split(' ')
                console.log(chapNum)
                return {
                    id: $doc('a', $el).attr('href'),
                    chapNum: Number(chapNum),
                    name: $doc('a', $el)?.text()?.trim(),
                    time: this.convertTime($doc('.publishedDate', $el).text(), 'DD/MM/YYYY hh:mm'),
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

    isLastPage($doc: CheerioAPI): boolean {
        const $root = $doc('.pagination-outter')
        const currentPage = $doc('li.active', $root)?.text()
        const nextPage = $doc('li.active + li')?.text()

        return currentPage === (nextPage || '')
    }
}
