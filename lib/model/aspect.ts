export type Aspect = 'mentoring' | 'tutoring';
export function isAspect(param: any): param is Aspect {
  return param === 'mentoring' || param === 'tutoring';
}
