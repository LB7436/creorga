import { useEffect, useState } from 'react'

/**
 * v5.0 — i18n léger pour l'app guest (FR/EN/DE/PT). Ne couvre que les
 * sections orientées client (GuestHome, GamesSection titres, ChatSection
 * placeholder) — l'app staff reste en français.
 */

export type GuestLang = 'fr' | 'en' | 'de' | 'pt'

const DICT: Record<GuestLang, Record<string, string>> = {
  fr: {
    tab_games: 'Jeux',
    tab_menu: 'Menu',
    tab_chat: 'Chat',
    tab_reviews: 'Avis',
    order_title: 'Ma commande',
    order_received: 'Reçue',
    order_preparing: 'En préparation',
    order_on_the_way: 'En route',
    call_waiter: 'Appeler le serveur',
    call_waiter_sent: 'Le serveur arrive',
    call_bill: "Demander l'addition",
    call_bill_sent: 'Addition en préparation',
    pay_bill: "Payer l'addition",
    pay_bill_unavailable: 'Paiement en ligne indisponible',
    pay_bill_processing: 'Redirection…',
    send_order: 'Envoyer la commande',
    sending_order: 'Envoi en cours…',
    order_success_title: 'Commande envoyée !',
    order_success_subtitle: 'Votre commande a été transmise en cuisine.',
    cart_empty: 'Votre panier est vide',
    register_prompt_order: 'Inscrivez-vous pour commander : email, mobile et pseudo permettent au serveur et au patron de retrouver votre demande.',
    games_title: 'Jeux',
    games_records: 'Records de la salle',
    chat_placeholder: 'Écrivez votre message…',
  },
  en: {
    tab_games: 'Games',
    tab_menu: 'Menu',
    tab_chat: 'Chat',
    tab_reviews: 'Reviews',
    order_title: 'My order',
    order_received: 'Received',
    order_preparing: 'Preparing',
    order_on_the_way: 'On the way',
    call_waiter: 'Call the waiter',
    call_waiter_sent: 'The waiter is coming',
    call_bill: 'Ask for the bill',
    call_bill_sent: 'Bill being prepared',
    pay_bill: 'Pay the bill',
    pay_bill_unavailable: 'Online payment unavailable',
    pay_bill_processing: 'Redirecting…',
    send_order: 'Send order',
    sending_order: 'Sending…',
    order_success_title: 'Order sent!',
    order_success_subtitle: 'Your order has been sent to the kitchen.',
    cart_empty: 'Your cart is empty',
    register_prompt_order: 'Sign up to order: email, mobile and nickname let the staff find your request.',
    games_title: 'Games',
    games_records: 'Room records',
    chat_placeholder: 'Write your message…',
  },
  de: {
    tab_games: 'Spiele',
    tab_menu: 'Menü',
    tab_chat: 'Chat',
    tab_reviews: 'Bewertungen',
    order_title: 'Meine Bestellung',
    order_received: 'Erhalten',
    order_preparing: 'In Zubereitung',
    order_on_the_way: 'Unterwegs',
    call_waiter: 'Kellner rufen',
    call_waiter_sent: 'Der Kellner kommt',
    call_bill: 'Rechnung anfordern',
    call_bill_sent: 'Rechnung wird vorbereitet',
    pay_bill: 'Rechnung bezahlen',
    pay_bill_unavailable: 'Online-Zahlung nicht verfügbar',
    pay_bill_processing: 'Weiterleitung…',
    send_order: 'Bestellung senden',
    sending_order: 'Senden…',
    order_success_title: 'Bestellung gesendet!',
    order_success_subtitle: 'Ihre Bestellung wurde an die Küche übermittelt.',
    cart_empty: 'Ihr Warenkorb ist leer',
    register_prompt_order: 'Registrieren Sie sich, um zu bestellen: E-Mail, Handynummer und Spitzname helfen dem Personal, Ihre Anfrage zu finden.',
    games_title: 'Spiele',
    games_records: 'Bestenliste',
    chat_placeholder: 'Schreiben Sie Ihre Nachricht…',
  },
  pt: {
    tab_games: 'Jogos',
    tab_menu: 'Menu',
    tab_chat: 'Chat',
    tab_reviews: 'Avaliações',
    order_title: 'Meu pedido',
    order_received: 'Recebido',
    order_preparing: 'Em preparo',
    order_on_the_way: 'A caminho',
    call_waiter: 'Chamar o garçom',
    call_waiter_sent: 'O garçom está chegando',
    call_bill: 'Pedir a conta',
    call_bill_sent: 'Conta sendo preparada',
    pay_bill: 'Pagar a conta',
    pay_bill_unavailable: 'Pagamento online indisponível',
    pay_bill_processing: 'Redirecionando…',
    send_order: 'Enviar pedido',
    sending_order: 'Enviando…',
    order_success_title: 'Pedido enviado!',
    order_success_subtitle: 'Seu pedido foi enviado para a cozinha.',
    cart_empty: 'Seu carrinho está vazio',
    register_prompt_order: 'Cadastre-se para pedir: email, celular e apelido permitem que a equipe encontre seu pedido.',
    games_title: 'Jogos',
    games_records: 'Recordes da sala',
    chat_placeholder: 'Escreva sua mensagem…',
  },
}

const STORAGE_KEY = 'creorga.guest.lang'

function detectDefaultLang(): GuestLang {
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'fr'
  return (['fr', 'en', 'de', 'pt'] as GuestLang[]).includes(nav as GuestLang) ? (nav as GuestLang) : 'fr'
}

export function useGuestLang() {
  const [lang, setLangState] = useState<GuestLang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as GuestLang | null
      return stored && DICT[stored] ? stored : detectDefaultLang()
    } catch { return 'fr' }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* */ }
  }, [lang])

  const setLang = (l: string) => {
    if (DICT[l as GuestLang]) setLangState(l as GuestLang)
  }

  const t = (key: string): string => DICT[lang][key] || DICT.fr[key] || key

  return { lang, setLang, t }
}
