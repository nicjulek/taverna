import { BadRequestException, PipeTransform } from '@nestjs/common'
import { ZodType } from 'zod'

export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value)
    if (parsed.success) return parsed.data
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    throw new BadRequestException({ message: 'Dados inválidos', fields })
  }
}
