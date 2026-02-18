import { doc, setDoc} from 'firebase/firestore'
import { threadLinks } from '~/entities/threadLink/model/threadLink.mock'
import { db } from '~/shared/firebase.client'


export async function seedThreadLinks() {
  for (const link of threadLinks) {
    await setDoc(
      doc(db, 'threadLinks', link.id),
      link
    )
  }

  console.log('Thread links seeded successfully')
}
