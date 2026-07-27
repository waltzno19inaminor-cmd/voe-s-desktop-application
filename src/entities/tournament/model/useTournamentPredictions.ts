import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { ref } from 'vue'
import { db } from '~/shared/firebase.client'
import type {
  SubmitTournamentPredictionInput,
  TournamentPrediction
} from './tournament-prediction.types'

export const predictionsForRound = ref<TournamentPrediction[]>([])

let predictionsUnsubscribe: (() => void) | null = null
let predictionsListenerKey = ''

export async function submitTournamentPrediction(input: SubmitTournamentPredictionInput) {
  if (
    !input.tournamentId
    || !input.seasonId
    || !input.roundId
    || !input.userId
    || !input.displayName
    || !input.assetId
    || !input.asset
  ) {
    throw new Error('Tournament, season, round, user and asset are required to submit a prediction.')
  }

  const predictionId = `${input.userId}_${input.assetId}`
  const predictionRef = doc(
    db,
    'tournaments',
    input.tournamentId,
    'seasons',
    input.seasonId,
    'rounds',
    input.roundId,
    'predictions',
    predictionId
  )

  await setDoc(predictionRef, {
    userId: input.userId,
    displayName: input.displayName,
    assetId: input.assetId,
    asset: input.asset,
    predict: input.predict,
    predictTime: serverTimestamp()
  }, { merge: true })
}

export function initTournamentPredictionsListener(input: {
  tournamentId?: string
  seasonId?: string
  roundId?: string
  userId?: string
  canReadAll?: boolean
}) {
  const { tournamentId, seasonId, roundId, userId, canReadAll = false } = input
  const listenerKey = [tournamentId, seasonId, roundId, userId, canReadAll].join(':')

  if (!tournamentId || !seasonId || !roundId || !userId) {
    terminateTournamentPredictionsListener()
    return
  }

  if (predictionsUnsubscribe && predictionsListenerKey === listenerKey) return

  terminateTournamentPredictionsListener()
  predictionsListenerKey = listenerKey
  predictionsForRound.value = []

  const predictionsCollection = collection(
    db,
    'tournaments',
    tournamentId,
    'seasons',
    seasonId,
    'rounds',
    roundId,
    'predictions'
  )
  const predictionsQuery = canReadAll
    ? predictionsCollection
    : query(predictionsCollection, where('userId', '==', userId))

  predictionsUnsubscribe = onSnapshot(predictionsQuery, (snapshot) => {
    predictionsForRound.value = snapshot.docs.map((predictionSnapshot) => {
      return { ...predictionSnapshot.data(), id: predictionSnapshot.id } as TournamentPrediction
    })
  }, (err) => {
    predictionsForRound.value = []
    console.warn('[Tournament] Error listening to predictions:', err)
  })
}

export function terminateTournamentPredictionsListener() {
  if (predictionsUnsubscribe) {
    predictionsUnsubscribe()
    predictionsUnsubscribe = null
  }
  predictionsListenerKey = ''
  predictionsForRound.value = []
}
