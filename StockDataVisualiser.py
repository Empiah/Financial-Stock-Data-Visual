import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import quandl

# ~/Dropbox/6.\ Python/Python\ Projects/StockData/Financial-Stock-Data-Visual

#the objective of this is to get stock data to enable us to produce the statistics that we want
#for this we will use quandl - it is easy to use and has its own package

quandl.ApiConfig.api_key = 'EYNDSC9qo_AsccGyr4gR'
quandl.ApiConfig.api_version = '2015-04-09'

#first of all we need to get some input from the user as to what stocks they want to see
def get_user_input_ticker():
    
    #in an excel document we have a list of all acceptable values that can be entered
    available_tickers = pd.read_csv('Data/ticker_list.csv')
    available_tickers = available_tickers[['ticker']]

    #general overview to the user of what this script will do
    print('This script will take some user input and display various statistics and graphs')
    
    #this will get some user input, it will only take valid inputs
    while True:
        try:
            ticker = str(input('\nPlease enter a stock ticker:\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('{} was not understood'.format(ticker))
            continue
        #this will return if what is entered is not in the csv above
        if ticker.upper() not in available_tickers:
            print('{} was not in the list of available tickers').format(ticker)
            continue
        #if these criterias are all met then we can accept the input
        else:
            ticker = ticker.upper()
            break
    return ticker

def get_user_input_date():

    year = str(input('\nPlease enter the year you want to search on\n'))




#first we need to find a webservice that will allow us to take in stock data
#for this we will use Quandl - we have made an accounts

data = quandl.get_table('WIKI/PRICES', ticker = ['AAPL', 'MSFT', 'WMT'], 
                        qopts = { 'columns': ['ticker', 'date', 'adj_close'] }, 
                        date = { 'gte': '2015-12-31', 'lte': '2016-12-31' }, 
                        paginate=True)
print(data.head())
