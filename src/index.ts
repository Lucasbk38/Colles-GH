import { writeFile } from 'fs/promises'
import colloscope from '../data/colloscope.json'
import rooms from '../data/rooms.json'
import { ICalCalendar, ICalDate, ICalEvent } from './ical'


for (const eleve of colloscope.eleves) {
    const idEleve = eleve.id
    const groups = colloscope.groupes.filter(e => e.eleves.includes(idEleve)).map(({ id }) => id)
    const stringWithOf = (str: string) => ('aeiouy'.includes(str.toLowerCase()[0]) ? "d'" : 'de ') + str

    const colles = colloscope.rendezvous
        .filter(e => groups.includes(e.groupe) || e.eleves.includes(idEleve))
        .map(({ colle, semaine }) => ({ colle: colloscope.colles.find(e => e.id === colle), semaine }))
        .map(({ semaine, colle: { colleur, enseignement: enseignementId, jour, heure, heure_fin, minutes, minutes_fin, id, identifiant } }) => {

            const [lundiJour, lundiMois] = colloscope.semaines.find(e => e.id === semaine).date_lundi.split('/').map(Number)

            const year = lundiMois >= 8 ? 2024 : 2025
            const startUTC = Number(new Date(year, lundiMois - 1, lundiJour, heure, minutes)) + jour * 24 * 3600 * 1000
            const endUTC   = startUTC + ((heure_fin - heure) * 60 + (minutes_fin - minutes)) * 60 * 1_000

            const enseignement = colloscope.enseignements.find(e => e.id === enseignementId)

            return {
                room: rooms.find(room => room.id === identifiant)?.room,
                id: `${ id }-${ semaine }`,
                identifiant,
                start: ICalDate.from(new Date(startUTC)),
                end: ICalDate.from(new Date(endUTC)),
                colleur: colloscope.colleurs.find(e => e.id === colleur).user,
                enseignement: {
                    nom: enseignement.discipline.nom,
                    raccourci: enseignement.raccourci
                }
            }
        })
        .map(({ id, identifiant, colleur, enseignement, start, end, room }) => new ICalEvent({
            id,
            location: room,
            summary: `${ identifiant } : Colle ${ stringWithOf(enseignement.raccourci) } avec ${ colleur.last_name }`,
            description: `${ identifiant } : Colle ${ stringWithOf(enseignement.nom) } avec ${ colleur.first_name } ${ colleur.last_name }`,
            start,
            end
        }))

    const calendar = new ICalCalendar({
        name: `Calendrier des colles ${ stringWithOf(eleve.user.first_name) } ${ eleve.user.last_name }`
    })

    calendar.addEvents(colles)
    
    writeFile(`./users/${ eleve.user.first_name }_${ eleve.user.last_name }.ics`, calendar.toText())
}
