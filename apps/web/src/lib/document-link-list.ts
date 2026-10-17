/** Transport de lecture extrait de l'interface pour contrôler les réponses tardives. */
export function createDocumentLinkList() {
  let generation = 0, disposed = false
  return {
    invalidate() { generation++ },
    dispose() { disposed = true; generation++ },
    async read<T>(load: () => Promise<T>, publish: (value: T) => void): Promise<boolean> {
      if (disposed) return false
      const request = ++generation
      try {
        const value = await load()
        if (disposed || request !== generation) return false
        publish(value)
        return true
      } catch (error) {
        if (disposed || request !== generation) return false
        throw error
      }
    },
  }
}
