const defaultTimezone = 'Europe/Paris'

export class ICalDate {
    constructor (
        public year: number,
        public month: number,
        public day: number,
        public hour = 0,
        public minutes = 0,
        public seconds = 0
    ) { }

    toText () {
        return String(this.year) .padStart(4, '0') +
               String(this.month).padStart(2, '0') +
               String(this.day)  .padStart(2, '0') +
               'T' +
               String(this.hour)   .padStart(2, '0') +
               String(this.minutes).padStart(2, '0') +
               String(this.seconds).padStart(2, '0') +
               'Z'
    }

    static from (date: Date) {
        return new ICalDate(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes()
        )
    }
}
    

class ICalProp {
    constructor (
        private key: string,
        private value?: string | ICalConvertible
    ) { }

    toText () {
        if (!this.value)
            return ''

        let value = this.value

        if (typeof value === 'object')
            value = value.toText()

        return this.key + ':' + value + '\n'
    }
}

type ICalSectionName = 'VCALENDAR' | 'VEVENT'
type ICalConvertible = {
    toText(content?: ICalConvertible[]): string
}


export class ICalSection {
    constructor (
        private sectionName: ICalSectionName,
        private props: ICalProp[]
    ) { }

    toText (content: ICalConvertible[] = []) {
        return [
            new ICalProp('BEGIN', this.sectionName),
            ...this.props,
            ...content,
            new ICalProp('END', this.sectionName)
        ].map(e => e.toText()).join('')
    }
}

export class ICalEvent extends ICalSection {
    constructor (public data: {
        summary: string,
        start: ICalDate,
        end: ICalDate,
        description: string,
        id?: string | number,
        organizer?: string,
        location?: string,
        timezone?: string
    }) {
        const timezone = data.timezone ?? defaultTimezone

        const start = data.start.toText()
        const end = data.end.toText()

        super('VEVENT', [
            new ICalProp('SUMMARY', data.summary),
            new ICalProp(`DTSTART;TZID="${ timezone }"`, start),
            new ICalProp(`DTEND;TZID="${ timezone }"`, end),
            new ICalProp('DESCRIPTION', data.description),
            new ICalProp('UID', data.id?.toString() ?? [ data.summary, start, end, data.description, data.location ].filter(e => e).join('-')),
            new ICalProp('ORGANIZER', data.organizer),
            new ICalProp('LOCATION', data.location)
        ])
    }
}

export class ICalCalendar {
    private section: ICalSection
    private events: ICalEvent[] = []

    constructor (
        private config: {
            version?: '2.0',
            name: string,
            timezone?: string
        }
    ) {
        this.section = new ICalSection('VCALENDAR', [
            new ICalProp('VERSION', config.version ?? '2.0'),
            new ICalProp('NAME', config.name),
            new ICalProp('X-WR-CALNAME', config.name),
            new ICalProp('TIMEZONE-ID', config.timezone ?? defaultTimezone)
        ])
    }

    addEvents (events: ICalEvent[], ifOverlap: 'removeFirst' | 'removeLast' | 'keepBoth' = 'removeFirst') {
        if (ifOverlap === 'keepBoth')
            this.events.push(...events)
        else for (const event of events) {
            const overlaps: ICalEvent[] = []

            for (const e of this.events)
                if (
                    (e.data.start.toText() <= event.data.start.toText() && event.data.start.toText() <= e.data.end.toText()) ||
                    (event.data.start.toText() <= e.data.start.toText() && e.data.start.toText() <= event.data.end.toText())
                ) overlaps.push(e)

            if (overlaps.length === 0) {
                this.events.push(event)
                continue
            }
            
            if (ifOverlap === 'removeFirst') {
                this.events = this.events.filter(e => !overlaps.includes(e))
                this.events.push(event)
            }
        }
    }

    toText (events: ICalEvent[] = []) {
        return this.section.toText(this.events.concat(events))
    }
}