import { describe, expect, it } from 'vitest'
import { currencyAmountError as error, formatCurrencyAmount as format } from './currencyAmount'
describe('strict dollars and cents', () => {
  it.each([['125','125.00'],['125.5','125.50'],['.5','0.50'],['12.','12.00'],['00012.01','12.01'],['0','0.00'],['-12.5','-12.50'],['',''],['   ','']])('formats %s without shifting dollars', (input, expected) => expect(format(input)).toBe(expected))
  it.each(['12.345','1e3','1,234.56','$12.00','12abc','--1','Infinity','NaN','.'])('keeps invalid %s intact and refuses it', text => { expect(format(text)).toBe(text); expect(error(text)).not.toBeNull() })
  it('distinguishes empty, optional and genuine zero', () => {expect(error('',{required:true})).not.toBeNull();expect(error(null)).toBeNull();expect(error('0',{required:true,min:'0'})).toBeNull();expect(error('0',{min:'0.01'})).not.toBeNull()})
  it('preserves signed fields while enforcing caller limits', () => {expect(error('-0.01',{min:'0'})).not.toBeNull();expect(error('-12.5',{min:'-20'})).toBeNull()})
  it('checks exact numeric-column boundaries without rounding', () => {expect(error('99999999.99',{max:'99999999.99'})).toBeNull();expect(error('100000000',{max:'99999999.99'})).not.toBeNull();expect(error('9999999999.99',{max:'9999999999.99'})).toBeNull();expect(error('99999999999999999999999',{max:'9999999999.99'})).not.toBeNull()})
})
